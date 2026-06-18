/**
 * Hash-chain primitives for the audit trail.
 *
 * Each record's hash binds its own contents AND the hash of the record before
 * it: hash_k = keccak256(canonical(record_k_fields, prevHash = hash_{k-1})).
 * Tampering with record k therefore changes hash_k, which breaks the prevHash
 * link of record k+1, and so on — a single edit invalidates the entire suffix.
 */

import { ethers } from 'ethers'
import type { AuditRecordCore } from './types'

/** prevHash of the first record in any chain (32 zero bytes). */
export const GENESIS_HASH = '0x' + '0'.repeat(64)

/**
 * Deterministic, canonical JSON serialization. Object keys are emitted in
 * sorted order at every level so the same logical value always yields the same
 * string — and therefore the same hash — regardless of property insertion
 * order. bigint is encoded as a decimal string; `undefined` properties are
 * omitted; non-finite numbers are rejected (they cannot be reproduced).
 */
export function canonicalize(value: unknown): string {
  return serialize(value)
}

function serialize(value: unknown): string {
  if (value === null) return 'null'
  const t = typeof value
  if (t === 'string') return JSON.stringify(value)
  if (t === 'boolean') return value ? 'true' : 'false'
  if (t === 'bigint') return '"' + (value as bigint).toString() + '"'
  if (t === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new Error('canonicalize: non-finite numbers are not supported')
    }
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return '[' + value.map((v) => serialize(v === undefined ? null : v)).join(',') + ']'
  }
  if (t === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + serialize(obj[k])).join(',') + '}'
  }
  throw new Error('canonicalize: unsupported type ' + t)
}

/**
 * Compute the keccak256 hash that binds a record's contents and its link to the
 * previous record. Field order is fixed by the canonical object encoding, so
 * the hash is stable across runs and machines.
 */
export function computeRecordHash(core: AuditRecordCore): string {
  const encoded = canonicalize({
    index: core.index,
    sessionId: core.sessionId,
    timestamp: core.timestamp,
    party: core.party,
    actor: core.actor,
    event: core.event,
    payload: core.payload,
    prevHash: core.prevHash,
  })
  return ethers.keccak256(ethers.toUtf8Bytes(encoded))
}
