/**
 * An append-only, tamper-evident audit trail: a hash-chain of signed
 * attestations.
 *
 * `append` links each new record to the previous record's hash and signs it.
 * `verifyRecords` walks the chain and reports the FIRST record that fails any
 * integrity check — sequential index, prevHash link, content hash, signature —
 * which is the exact point at which tampering, reordering, insertion, deletion,
 * or replay occurred. This is the break-point detection demonstrated for the
 * thesis (Figure 5).
 */

import { computeRecordHash, GENESIS_HASH } from './hash-chain'
import { signHash, recoverSigner, addressForKey } from './attestation'
import type {
  AuditRecord,
  AuditRecordCore,
  AuditVerification,
  AttestationInput,
} from './types'

export class AuditTrail {
  readonly sessionId: string
  private records: AuditRecord[]

  constructor(sessionId: string, records: AuditRecord[] = []) {
    this.sessionId = sessionId
    this.records = [...records]
  }

  /** Current records (defensive copy). */
  getRecords(): AuditRecord[] {
    return [...this.records]
  }

  /** Number of records in the trail. */
  get length(): number {
    return this.records.length
  }

  /** keccak hash of the chain head — suitable for anchoring on-chain. */
  headHash(): string {
    return this.records.length ? this.records[this.records.length - 1].hash : GENESIS_HASH
  }

  /** Append a signed attestation and return the new record. */
  async append(input: AttestationInput): Promise<AuditRecord> {
    const prev = this.records[this.records.length - 1]
    const core: AuditRecordCore = {
      index: this.records.length,
      sessionId: this.sessionId,
      timestamp: input.timestamp ?? Date.now(),
      party: input.party,
      actor: addressForKey(input.privateKey),
      event: input.event,
      payload: input.payload ?? {},
      prevHash: prev ? prev.hash : GENESIS_HASH,
    }
    const hash = computeRecordHash(core)
    const signature = await signHash(input.privateKey, hash)
    const record: AuditRecord = { ...core, hash, signature }
    this.records.push(record)
    return record
  }

  /** Verify this trail's current records. */
  verify(): AuditVerification {
    return AuditTrail.verifyRecords(this.records)
  }

  /**
   * Verify an arbitrary record array (e.g. one loaded from storage, received
   * from a peer, or mutated by a tampering test). Returns the first break and
   * its reason, or a valid verdict when the whole chain is intact.
   */
  static verifyRecords(records: AuditRecord[]): AuditVerification {
    let prevHash = GENESIS_HASH
    for (let i = 0; i < records.length; i++) {
      const r = records[i]

      // 1. Index must be strictly sequential (catches reorder / replay).
      if (r.index !== i) {
        return {
          valid: false,
          brokenAt: i,
          reason: 'bad_index',
          detail: `record at position ${i} claims index ${r.index}`,
          checked: i + 1,
        }
      }

      // 2. Link must point at the previous record's hash (catches reorder / insert / delete).
      if (r.prevHash !== prevHash) {
        return {
          valid: false,
          brokenAt: i,
          reason: i === 0 ? 'genesis_mismatch' : 'broken_link',
          detail:
            i === 0
              ? 'first record does not link to the genesis hash'
              : 'prevHash does not match the preceding record',
          checked: i + 1,
        }
      }

      // 3. Stored hash must equal the recomputed hash (catches field / payload tampering).
      const recomputed = computeRecordHash({
        index: r.index,
        sessionId: r.sessionId,
        timestamp: r.timestamp,
        party: r.party,
        actor: r.actor,
        event: r.event,
        payload: r.payload,
        prevHash: r.prevHash,
      })
      if (recomputed !== r.hash) {
        return {
          valid: false,
          brokenAt: i,
          reason: 'hash_mismatch',
          detail: 'record contents do not match its recorded hash',
          checked: i + 1,
        }
      }

      // 4. Signature must recover to the recorded actor (catches forgery / actor swap).
      let signer: string
      try {
        signer = recoverSigner(r.hash, r.signature)
      } catch {
        return {
          valid: false,
          brokenAt: i,
          reason: 'signature_invalid',
          detail: 'signature could not be recovered',
          checked: i + 1,
        }
      }
      if (signer.toLowerCase() !== r.actor.toLowerCase()) {
        return {
          valid: false,
          brokenAt: i,
          reason: 'signature_invalid',
          detail: `signature recovers to ${signer}, not the recorded actor ${r.actor}`,
          checked: i + 1,
        }
      }

      prevHash = r.hash
    }

    return { valid: true, brokenAt: null, checked: records.length }
  }
}
