/**
 * Server-side on-chain bridge.
 *
 * This is the piece the codebase was missing: the API routes had well-written
 * Solidity contracts but never actually called them. Every function here is
 * defensive — if on-chain is disabled, contracts aren't deployed, or a tx
 * reverts, it returns `{ success: false }` and the caller falls back to the
 * pure-Redis flow so the demo never hard-crashes.
 *
 * The backend acts as a trusted relayer using SERVER_PRIVATE_KEY (the deployer
 * key, which holds every role). A single shared relayer means transactions
 * must be serialized and nonce-managed — we wrap the signer in ethers'
 * NonceManager and funnel every write through a promise queue so concurrent
 * API requests can't collide on the nonce. For a vertical-slice prototype this
 * relayer model is an acceptable simplification; production would use per-user
 * wallets / meta-transactions.
 */

import fs from 'fs'
import path from 'path'
import { ethers } from 'ethers'
import { config } from '@/lib/config'

interface Bound {
  provider: ethers.JsonRpcProvider
  signer: ethers.NonceManager
  contracts: Record<string, ethers.Contract>
}

let cached: Bound | null = null
let lastWarn = 0

function getBound(): Bound | null {
  if (!config.features.onchain) return null
  if (cached) return cached

  // No permanent failure latch: in containerized startup the chain service may
  // write the deployment files a few seconds after the web container boots, so
  // we re-attempt the load on each call until it succeeds.
  try {
    const dir = path.join(process.cwd(), 'deployments')
    const addresses: Record<string, string> = JSON.parse(
      fs.readFileSync(path.join(dir, `${config.network}-addresses.json`), 'utf8')
    )
    const abis: Record<string, any[]> = JSON.parse(
      fs.readFileSync(path.join(dir, `${config.network}-abis.json`), 'utf8')
    )

    const provider = new ethers.JsonRpcProvider(config.chain.rpcUrl)
    const wallet = new ethers.Wallet(config.chain.serverPrivateKey, provider)
    const signer = new ethers.NonceManager(wallet)

    const contracts: Record<string, ethers.Contract> = {}
    for (const [name, address] of Object.entries(addresses)) {
      if (abis[name]) contracts[name] = new ethers.Contract(address, abis[name], signer)
    }

    cached = { provider, signer, contracts }
    console.log('[onchain] bound to deployed contracts:', Object.keys(contracts).join(', '))
    return cached
  } catch (err) {
    // Throttle the warning so retries don't spam the logs.
    const now = Date.now()
    if (now - lastWarn > 15000) {
      lastWarn = now
      console.warn(
        '[onchain] deployment files not ready yet — will retry:',
        err instanceof Error ? err.message : err
      )
    }
    return null
  }
}

// Serialize all relayer writes (one shared key => one nonce stream).
let queue: Promise<unknown> = Promise.resolve()
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job)
  // Keep the chain alive regardless of individual job outcome.
  queue = run.then(() => undefined, () => undefined)
  return run
}

export interface TxResult {
  success: boolean
  txHash?: string
  blockNumber?: number
  error?: string
  data?: Record<string, any>
}

// Solidity enum orderings (keep in sync with the contracts).
const DATA_CATEGORY: Record<string, number> = {
  personal: 0, financial: 1, health: 2, behavioral: 3, commercial: 4, other: 5,
}
const COMPUTATION_TYPE: Record<string, number> = {
  aggregation: 0, machinelearning: 1, analytics: 2, comparison: 3, custom: 4,
}
const DATA_STATUS_ACTIVE = 1

/** Deterministic bytes32 data hash from a dataset id (stable across calls). */
export function dataHashFromId(datasetId: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(`smpc:dataset:${datasetId}`))
}

/** True when the on-chain bridge is configured and contracts are loadable. */
export function isOnchainEnabled(): boolean {
  return getBound() !== null
}

/**
 * Register a dataset on DataRegistry and immediately activate it so it can be
 * referenced by computation requests. Returns the registration tx hash.
 */
export async function registerDataOnChain(params: {
  datasetId: string
  metadataURI: string
  priceWei?: bigint
  category?: string
  tags?: string[]
  isEncrypted?: boolean
  dataSize?: number
}): Promise<TxResult> {
  const bound = getBound()
  if (!bound) return { success: false, error: 'onchain disabled' }

  const dataHash = dataHashFromId(params.datasetId)
  const category = DATA_CATEGORY[(params.category || 'other').toLowerCase()] ?? 5
  const price = params.priceWei && params.priceWei > BigInt(0) ? params.priceWei : ethers.parseEther('0.01')

  return enqueue(async () => {
    try {
      const registry = bound.contracts.DataRegistry
      const tx = await registry.registerData(
        dataHash,
        params.metadataURI || `ipfs://demo/${params.datasetId}`,
        price,
        category,
        params.tags || [],
        params.isEncrypted ?? true,
        BigInt(Math.max(1, Math.floor(params.dataSize || 1024)))
      )
      const receipt = await tx.wait()

      // Activate so downstream requests pass the "Active" check.
      const act = await registry.changeDataStatus(dataHash, DATA_STATUS_ACTIVE)
      await act.wait()

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt?.blockNumber,
        data: { dataHash },
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'unknown error' }
    }
  })
}

/**
 * Settle a completed computation through FeeManagement, which enforces the
 * canonical 70/25/4/1 split on-chain (provider/nodes/validators/treasury).
 * Returns the settlement tx hash and the on-chain fee breakdown.
 */
export async function settleFeesOnChain(params: {
  computationId: string
  totalWei?: bigint
  payer: string
}): Promise<TxResult> {
  const bound = getBound()
  if (!bound) return { success: false, error: 'onchain disabled' }

  const txId = ethers.keccak256(ethers.toUtf8Bytes(`smpc:settle:${params.computationId}`))
  const value = params.totalWei && params.totalWei > BigInt(0) ? params.totalWei : ethers.parseEther('0.01')

  return enqueue(async () => {
    try {
      const fee = bound.contracts.FeeManagement
      const breakdown = await fee.calculateFees(value) // view
      const tx = await fee.processFeePayment(txId, params.payer, `computation:${params.computationId}`, {
        value,
      })
      const receipt = await tx.wait()

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt?.blockNumber,
        data: {
          total: value.toString(),
          breakdown: {
            provider: breakdown.providerFee?.toString(),
            nodes: breakdown.computingNodeFee?.toString(),
            validators: breakdown.auditorFee?.toString(),
            treasury: breakdown.platformFee?.toString(),
          },
        },
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'unknown error' }
    }
  })
}

// ComputingRequest.ComputingStatus enum ordering (keep in sync with the contract).
const COMPUTING_STATUS = ['Pending', 'Approved', 'Computing', 'Completed', 'Failed', 'Cancelled', 'Disputed']

/**
 * Submit a computation request on ComputingRequest (consumer role). Submitted as
 * urgent so a single relayer-auditor approval suffices to reach Approved (the
 * relayer holds every role; production would use distinct consumer/auditors).
 * Returns the on-chain requestId parsed from the RequestSubmitted event.
 */
export async function submitRequestOnChain(params: {
  datasetId: string
  dataHash?: string
  computationType?: string
  scriptURI?: string
  feeWei?: bigint
  urgent?: boolean
}): Promise<TxResult> {
  const bound = getBound()
  if (!bound) return { success: false, error: 'onchain disabled' }

  const dataHash = params.dataHash || dataHashFromId(params.datasetId)
  const ctype = COMPUTATION_TYPE[(params.computationType || 'aggregation').toLowerCase()] ?? 0
  const value = params.feeWei && params.feeWei > BigInt(0) ? params.feeWei : ethers.parseEther('0.01')
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400)

  return enqueue(async () => {
    try {
      const cr = bound.contracts.ComputingRequest
      const tx = await cr.submitRequest(
        [dataHash],
        ctype,
        params.scriptURI || `ipfs://demo/script/${params.datasetId}`,
        deadline,
        [],
        params.urgent ?? true,
        BigInt(3600),
        { value }
      )
      const receipt = await tx.wait()

      // requestId is a return value of a state-changing call — recover it from the event.
      let requestId: string | undefined
      for (const log of receipt?.logs || []) {
        try {
          const parsed = cr.interface.parseLog(log)
          if (parsed?.name === 'RequestSubmitted') {
            requestId = parsed.args.requestId
            break
          }
        } catch {
          /* not a ComputingRequest event */
        }
      }

      return { success: true, txHash: tx.hash, blockNumber: receipt?.blockNumber, data: { requestId, dataHash } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'unknown error' }
    }
  })
}

/** Approve a pending request (auditor role) and report the resulting status. */
export async function approveRequestOnChain(requestId: string): Promise<TxResult> {
  const bound = getBound()
  if (!bound) return { success: false, error: 'onchain disabled' }

  return enqueue(async () => {
    try {
      const cr = bound.contracts.ComputingRequest
      const tx = await cr.approveRequest(requestId)
      const receipt = await tx.wait()

      let status: string | undefined
      try {
        const info = await cr.getRequestInfo(requestId)
        status = COMPUTING_STATUS[Number(info.status)] || String(info.status)
      } catch {
        /* view may revert if request not found */
      }

      return { success: true, txHash: tx.hash, blockNumber: receipt?.blockNumber, data: { requestId, status } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'unknown error' }
    }
  })
}

export interface VerifyResult {
  verified: boolean
  gasUsed?: string
  error?: string
}

/**
 * Verify a Groth16 proof on-chain via the deployed Groth16Verifier and measure
 * the verification gas. `calldata` is snarkjs' soliditycalldata output, i.e. the
 * string "[a],[b],[c],[input]". verifyProof is a `view` (returns bool, no revert
 * on an invalid proof), so this needs no nonce queue. A tampered public input
 * returns `verified: false` — the on-chain demonstration of soundness.
 */
export async function verifyProofOnChain(calldata: string): Promise<VerifyResult> {
  const bound = getBound()
  if (!bound) return { verified: false, error: 'onchain disabled' }

  const verifier = bound.contracts.Groth16Verifier
  if (!verifier) return { verified: false, error: 'Groth16Verifier not deployed' }

  try {
    const [a, b, c, input] = JSON.parse('[' + calldata.trim() + ']')
    const verified: boolean = await verifier.verifyProof(a, b, c, input)
    let gasUsed: string | undefined
    try {
      gasUsed = (await verifier.verifyProof.estimateGas(a, b, c, input)).toString()
    } catch {
      /* estimateGas may revert on some verifiers for an invalid proof — leave undefined */
    }
    return { verified, gasUsed }
  } catch (err) {
    return { verified: false, error: err instanceof Error ? err.message : 'verify failed' }
  }
}

export { COMPUTATION_TYPE }
