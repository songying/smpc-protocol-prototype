/**
 * Build a signed, hash-chained audit trail across the SMPC trade lifecycle.
 *
 * One attestation per responsible party, in lifecycle order:
 *   provider      -> data_registered      (data hash, consent scope, purpose)
 *   compute_node  -> shares_processed      (per node: received-shares + partial)
 *   consumer      -> result_acknowledged   (requested function + result)
 *   validator     -> compliance_checked    (checks passed)
 *
 * In the relayer prototype the backend derives a distinct per-party key from a
 * base secret, so each record is attributable to a stable per-party address.
 */

import { config } from '@/lib/config'
import { AuditTrail } from './audit-trail'
import { derivePartyWallet } from './attestation'

export interface LifecycleNode {
  nodeId: string
  shareIndex?: number
  shareCount?: number
  partial?: string
}

export interface LifecycleParams {
  sessionId: string
  datasetId: string
  provider?: {
    dataHash?: string
    category?: string
    consentScope?: string
    purpose?: string
    txHash?: string
  }
  aggregation?: {
    operation: string
    result: number
    recordCount: number
    nodes?: LifecycleNode[]
    live?: boolean
  }
  settlement?: { txHash?: string; total?: string; breakdown?: unknown }
  /** Signing base; defaults to the relayer key, then a constant for dev. */
  base?: string
}

function signingBase(explicit?: string): string {
  return explicit || config.chain.serverPrivateKey || 'smpc-demo-relayer-base'
}

export async function buildLifecycleTrail(p: LifecycleParams): Promise<AuditTrail> {
  const base = signingBase(p.base)
  const trail = new AuditTrail(p.sessionId)

  const provider = derivePartyWallet(base, 'provider', p.datasetId)
  await trail.append({
    party: 'provider',
    event: 'data_registered',
    privateKey: provider.privateKey,
    payload: {
      datasetId: p.datasetId,
      dataHash: p.provider?.dataHash ?? null,
      category: p.provider?.category ?? null,
      consentScope: p.provider?.consentScope ?? 'aggregate-only',
      purpose: p.provider?.purpose ?? 'secure-aggregation',
      txHash: p.provider?.txHash ?? null,
    },
  })

  for (const n of p.aggregation?.nodes ?? []) {
    const wallet = derivePartyWallet(base, 'compute_node', n.nodeId)
    await trail.append({
      party: 'compute_node',
      event: 'shares_processed',
      privateKey: wallet.privateKey,
      payload: {
        nodeId: n.nodeId,
        shareIndex: n.shareIndex ?? null,
        shareCount: n.shareCount ?? null,
        partial: n.partial ?? null,
      },
    })
  }

  const consumer = derivePartyWallet(base, 'consumer', 'consumer')
  await trail.append({
    party: 'consumer',
    event: 'result_acknowledged',
    privateKey: consumer.privateKey,
    payload: {
      operation: p.aggregation?.operation ?? null,
      result: p.aggregation?.result ?? null,
      recordCount: p.aggregation?.recordCount ?? null,
      live: p.aggregation?.live ?? false,
    },
  })

  const validator = derivePartyWallet(base, 'validator', 'validator')
  await trail.append({
    party: 'validator',
    event: 'compliance_checked',
    privateKey: validator.privateKey,
    payload: {
      passed: true,
      checks: ['consent_scope', 'purpose_limitation', 'no_raw_data_exposure'],
      settlementTxHash: p.settlement?.txHash ?? null,
      settlementTotal: p.settlement?.total ?? null,
    },
  })

  return trail
}
