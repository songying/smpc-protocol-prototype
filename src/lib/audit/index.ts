/**
 * Tamper-evident audit trail (thesis revision item B4 / QE2.2).
 *
 * A hash-chained log of signed per-party attestations across the SMPC trade
 * lifecycle. Any mutation, reordering, insertion, deletion, or replay is
 * detectable at the exact record where it occurs.
 */

export type {
  AuditParty,
  AuditRecord,
  AuditRecordCore,
  AuditBreakReason,
  AuditVerification,
  AttestationInput,
} from './types'
export { canonicalize, computeRecordHash, GENESIS_HASH } from './hash-chain'
export { derivePartyWallet, signHash, recoverSigner, addressForKey } from './attestation'
export { AuditTrail } from './audit-trail'
export { buildLifecycleTrail } from './lifecycle'
export type { LifecycleParams, LifecycleNode } from './lifecycle'
