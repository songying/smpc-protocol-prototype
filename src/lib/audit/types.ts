/**
 * Types for the tamper-evident audit trail (thesis revision item B4 / QE2.2).
 *
 * The trail is an append-only, hash-chained log of signed attestations. Each
 * party signs the lifecycle stage it is responsible for, and every record
 * commits to the hash of the previous record, so any mutation, reordering,
 * insertion, deletion, or replay becomes detectable at the exact point it
 * occurs. This realises the audit-hardening route the candidate committed to at
 * the defense and lifts the weakest expert-evaluation item (SP4).
 */

/** Role that produced (and signed) an attestation. */
export type AuditParty =
  | 'provider' // data provider: data hash, consent scope, purpose limitation
  | 'compute_node' // SMPC compute node: received-shares commitment, compute start/finish, partial
  | 'consumer' // data consumer: requested function, acknowledged result
  | 'validator' // compliance validator: checks passed / violations
  | 'coordinator' // off-chain orchestrator: lifecycle anchors

/** A single signed, hash-chained audit record. */
export interface AuditRecord {
  /** 0-based position in the chain. */
  index: number
  /** Logical session / computation this record belongs to. */
  sessionId: string
  /** Unix epoch milliseconds when the record was created. */
  timestamp: number
  /** Role that produced and signed this record. */
  party: AuditParty
  /** Ethereum address of the signer; the signature must recover to this. */
  actor: string
  /** Event name, e.g. 'data_registered', 'shares_received', 'compute_finished'. */
  event: string
  /** Event-specific, JSON-serializable payload. Canonicalized before hashing. */
  payload: Record<string, unknown>
  /** Hash of the previous record (GENESIS_HASH for the first record). */
  prevHash: string
  /** keccak256 over the canonical encoding of every field above. */
  hash: string
  /** EIP-191 signature over `hash` by `actor`. */
  signature: string
}

/** The subset of fields bound into `hash` (everything except hash + signature). */
export type AuditRecordCore = Omit<AuditRecord, 'hash' | 'signature'>

/** Why a chain failed verification. */
export type AuditBreakReason =
  | 'hash_mismatch' // stored hash != recomputed hash (a field/payload was tampered)
  | 'broken_link' // prevHash does not match the prior record's hash (reorder/insert/delete)
  | 'bad_index' // index is not strictly sequential (reorder/replay)
  | 'signature_invalid' // signature does not recover to `actor` (forgery)
  | 'genesis_mismatch' // first record's prevHash is not GENESIS_HASH

/** Result of verifying a chain: intact, or the first break and why. */
export interface AuditVerification {
  /** True when the entire chain is intact. */
  valid: boolean
  /** Index of the first invalid record, or null when valid. */
  brokenAt: number | null
  /** Machine-readable reason for the break, when invalid. */
  reason?: AuditBreakReason
  /** Human-readable detail. */
  detail?: string
  /** Number of records inspected before the verdict. */
  checked: number
}

/** Input to append a new attestation to a trail. */
export interface AttestationInput {
  party: AuditParty
  event: string
  payload?: Record<string, unknown>
  /** Private key the party signs with. In the relayer demo these are derived per role. */
  privateKey: string
  /** Override timestamp for determinism (tests); defaults to Date.now(). */
  timestamp?: number
}
