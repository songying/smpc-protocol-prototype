import { NextRequest, NextResponse } from 'next/server'
import { runSecureAggregation, runMpSpdzAggregation, simulateAggregation, SmpcOperation } from '@/lib/execution/smpc-orchestrator'
import { registerDataOnChain, settleFeesOnChain, submitRequestOnChain, approveRequestOnChain } from '@/lib/contracts/onchain'
import { verifyAggregationProof } from '@/lib/contracts/zk'
import { runFheAggregation } from '@/lib/mkfhe/aggregate'
import { config } from '@/lib/config'
import { buildLifecycleTrail } from '@/lib/audit/lifecycle'
import { AuditTrail } from '@/lib/audit/audit-trail'
import { persistTrail } from '@/lib/audit/store'

/**
 * One-click live demo of the full trade lifecycle, used by the Secure
 * Computation Terminal. Deliberately auth-free and self-contained so it is
 * reliable to run during a defense:
 *
 *   1) Register a dataset on-chain         -> real tx hash
 *   2) Secure aggregation across 3 nodes   -> real result, nodes see only shares
 *   3) Settle fees on-chain (70/25/4/1)    -> real tx hash + enforced split
 *
 * Every step degrades to a clearly-labelled simulation if the chain or nodes
 * are unavailable, so the page never breaks.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const allowed: SmpcOperation[] = ['sum', 'mean', 'count', 'variance', 'dotProduct']
    const operation: SmpcOperation = allowed.includes(body.operation) ? body.operation : 'mean'
    // Compute backend: information-theoretic MP-SPDZ (default) or homomorphic FHE.
    const backend: 'mpspdz' | 'fhe' = body.backend === 'fhe' ? 'fhe' : 'mpspdz'
    const valuesB: number[] | undefined =
      Array.isArray(body.valuesB) && body.valuesB.every((v: any) => typeof v === 'number') ? body.valuesB : undefined
    // Phase IV tamper toggle: claim a wrong total so the on-chain verifier rejects it.
    const tamper = body.tamper === true || new URL(request.url).searchParams.get('tamper') === '1'

    // Demo numeric column: caller-provided or a deterministic sample.
    const values: number[] =
      Array.isArray(body.values) && body.values.every((v: any) => typeof v === 'number')
        ? body.values
        : [42, 17, 99, 5, 230, 81, 64, 38, 120, 7]

    const datasetId = `demo_${Date.now()}`
    const sessionId = `sess_${datasetId}`

    // Step 1 — on-chain data registration (best-effort).
    let registration: any = { live: false }
    if (config.features.onchain) {
      const reg = await registerDataOnChain({
        datasetId,
        metadataURI: `ipfs://demo/${datasetId}`,
        category: 'health',
        tags: ['demo', 'terminal'],
      })
      registration = reg.success
        ? { live: true, txHash: reg.txHash, blockNumber: reg.blockNumber, dataHash: reg.data?.dataHash }
        : { live: false, error: reg.error }
    }

    // Step 1.5 — on-chain computation request + auditor approval (lifecycle integrity).
    // Submitted urgent so one relayer-auditor approval reaches "Approved".
    let requestStep: any = { live: false }
    if (config.features.onchain && registration.live && registration.dataHash) {
      const sub = await submitRequestOnChain({
        datasetId,
        dataHash: registration.dataHash,
        computationType: 'aggregation',
        urgent: true,
      })
      if (sub.success && sub.data?.requestId) {
        const appr = await approveRequestOnChain(sub.data.requestId)
        requestStep = {
          live: true,
          requestId: sub.data.requestId,
          submitTxHash: sub.txHash,
          approveTxHash: appr.txHash,
          status: appr.data?.status,
        }
      } else {
        requestStep = { live: false, error: sub.error }
      }
    }

    // Step 2 — secure computation. FHE handles additive ops; everything else
    // (and multiplicative variance/dotProduct) runs the MP-SPDZ node protocol.
    const fheCapable = backend === 'fhe' && (operation === 'sum' || operation === 'mean' || operation === 'count')
    // Ops with a precompiled real MP-SPDZ program (sum/mean/variance/dotProduct;
    // count is public metadata and needs no MPC).
    const mpSpdzCapable = backend === 'mpspdz' && operation !== 'count'
    let aggregation: any
    try {
      if (fheCapable) {
        aggregation = await runFheAggregation(values, operation as 'sum' | 'mean' | 'count')
      } else if (mpSpdzCapable) {
        // Prefer the real MP-SPDZ framework; fall back to the JS Shamir engine.
        try {
          aggregation = await runMpSpdzAggregation(values, operation, { valuesB })
        } catch (e) {
          aggregation = await runSecureAggregation(values, operation, { sessionId, valuesB })
          aggregation.engine = 'js-shamir'
        }
        aggregation.backend = 'mpspdz'
      } else {
        aggregation = await runSecureAggregation(values, operation, { sessionId, valuesB })
        aggregation.engine = aggregation.engine || 'js-shamir'
        aggregation.backend = 'mpspdz'
      }
    } catch (err) {
      aggregation = simulateAggregation(values, operation, valuesB)
      aggregation.backend = backend
    }
    if (!Array.isArray(aggregation.nodes)) aggregation.nodes = []

    // Step 2.5 — Phase IV verification: a Groth16 proof that the result was
    // computed correctly is checked on-chain. Settlement is gated on it.
    const zk = await verifyAggregationProof(values, tamper)

    // Step 3 — on-chain settlement enforcing the canonical fee split.
    // Gated on the proof: a tampered result cannot be settled (thesis Phase IV).
    let settlement: any = { live: false }
    if (!zk.verified) {
      settlement = { live: false, blocked: true, reason: 'settlement blocked — aggregation proof did not verify' }
    } else if (config.features.onchain) {
      const s = await settleFeesOnChain({ computationId: datasetId, payer: '0x' + '0'.repeat(40) })
      settlement = s.success
        ? { live: true, txHash: s.txHash, blockNumber: s.blockNumber, breakdown: s.data?.breakdown, total: s.data?.total }
        : { live: false, error: s.error }
    }

    // Step 4 — tamper-evident, signed audit trail across the whole lifecycle.
    // Hash-chained per-party attestations; persisted best-effort to Redis and
    // verifiable via GET /api/demo/audit?sessionId=... (thesis B4 / QE2.2).
    let audit: any = { live: false }
    try {
      const trail = await buildLifecycleTrail({
        sessionId,
        datasetId,
        provider: { dataHash: registration?.dataHash, category: 'health', txHash: registration?.txHash },
        aggregation: {
          operation: aggregation.operation,
          result: aggregation.result,
          recordCount: aggregation.recordCount,
          nodes: aggregation.nodes,
          live: aggregation.live,
        },
        settlement: { txHash: settlement?.txHash, total: settlement?.total, breakdown: settlement?.breakdown },
      })
      const persisted = await persistTrail(trail)
      let records = trail.getRecords()
      let verification = trail.verify()
      // Tamper toggle: mutate one record's payload without re-hashing, so the
      // hash-chain verifier flags the exact break point (thesis Fig 5.8).
      if (tamper && records.length > 2) {
        const k = 2
        records = records.map((r, i) =>
          i === k ? { ...r, payload: { ...(r.payload as object), result: 'TAMPERED' } } : r
        )
        verification = AuditTrail.verifyRecords(records)
      }
      audit = {
        live: true,
        sessionId,
        tampered: tamper,
        recordCount: records.length,
        headHash: trail.headHash(),
        verification,
        persisted,
        records,
      }
    } catch (err) {
      audit = { live: false, error: err instanceof Error ? err.message : 'audit build failed' }
    }

    return NextResponse.json({
      datasetId,
      inputCount: values.length,
      registration,
      request: requestStep,
      aggregation,
      zk,
      settlement,
      audit,
      onchainEnabled: config.features.onchain,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'demo run failed' },
      { status: 500 }
    )
  }
}
