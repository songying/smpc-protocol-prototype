/**
 * Backend registry for the comparative benchmark (thesis B1 / QE4.2).
 *
 * `centralized` is implemented in the scaffold so the harness runs end-to-end
 * today. The three privacy-preserving backends are Tier-1 work: each declares
 * `available() === false` for now, so the harness skips it cleanly until the
 * real adapter lands. Wiring order: `our-protocol` after B-MPC (real MP-SPDZ)
 * + B0 (L2 deploy); `fhe`/`tee` as standalone OpenFHE / SGX adapters.
 */

import type { Backend, TrustAssumption } from '../types'
import { centralizedBackend } from './centralized'
import { ourProtocolBackend } from './our-protocol'
import { fheBackend } from './fhe'

function pendingBackend(name: string, trust: TrustAssumption, note: string): Backend {
  return {
    name,
    trustAssumption: trust,
    async available() {
      return false
    },
    async run() {
      throw new Error(`${name} backend not implemented yet: ${note}`)
    },
  }
}

export { ourProtocolBackend }
export { fheBackend }
export const teeBackend = pendingBackend(
  'tee',
  'hardware-vendor',
  'Gramine + Intel SGX, or Azure Confidential Computing if no SGX hardware (Tier 1)'
)

/** All backends in reporting order. The harness runs only the available ones. */
export const ALL_BACKENDS: Backend[] = [
  centralizedBackend,
  ourProtocolBackend,
  fheBackend,
  teeBackend,
]
