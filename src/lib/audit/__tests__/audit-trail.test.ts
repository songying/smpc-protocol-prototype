/**
 * Tests for the tamper-evident audit trail (thesis B4 / QE2.2).
 *
 * These cases ARE the break-point proof committed at the defense: a valid
 * lifecycle chain verifies intact, and every class of tampering — payload
 * mutation, signature forgery, reordering, replay, deletion, broken genesis —
 * is detected at the exact record where it occurs.
 */

import {
  AuditTrail,
  derivePartyWallet,
  canonicalize,
  computeRecordHash,
  signHash,
  GENESIS_HASH,
} from '@/lib/audit'

const BASE = 'test-base-deterministic'
const SESSION = 'sess_test_1'

// Fixed, attributable per-party signers.
const provider = derivePartyWallet(BASE, 'provider', 'p1')
const node1 = derivePartyWallet(BASE, 'compute_node', 'n1')
const node2 = derivePartyWallet(BASE, 'compute_node', 'n2')
const node3 = derivePartyWallet(BASE, 'compute_node', 'n3')
const consumer = derivePartyWallet(BASE, 'consumer', 'c1')
const validator = derivePartyWallet(BASE, 'validator', 'v1')

/** Build a realistic 6-record trade-lifecycle chain with fixed timestamps. */
async function buildLifecycleChain(): Promise<AuditTrail> {
  const trail = new AuditTrail(SESSION)
  let t = 1_700_000_000_000
  await trail.append({
    party: 'provider',
    event: 'data_registered',
    privateKey: provider.privateKey,
    timestamp: t++,
    payload: { dataHash: '0xabc', consentScope: 'aggregate-only', purpose: 'research' },
  })
  await trail.append({
    party: 'compute_node',
    event: 'shares_received',
    privateKey: node1.privateKey,
    timestamp: t++,
    payload: { node: 1, shareCommitment: '0x111' },
  })
  await trail.append({
    party: 'compute_node',
    event: 'shares_received',
    privateKey: node2.privateKey,
    timestamp: t++,
    payload: { node: 2, shareCommitment: '0x222' },
  })
  await trail.append({
    party: 'compute_node',
    event: 'compute_finished',
    privateKey: node3.privateKey,
    timestamp: t++,
    payload: { node: 3, partial: '9988' },
  })
  await trail.append({
    party: 'consumer',
    event: 'result_acknowledged',
    privateKey: consumer.privateKey,
    timestamp: t++,
    payload: { fn: 'mean', result: 70.3 },
  })
  await trail.append({
    party: 'validator',
    event: 'compliance_checked',
    privateKey: validator.privateKey,
    timestamp: t++,
    payload: { passed: true, violations: 0 },
  })
  return trail
}

describe('AuditTrail — hash-chained signed attestations (B4 / QE2.2)', () => {
  it('builds a valid lifecycle chain that verifies intact', async () => {
    const trail = await buildLifecycleChain()
    expect(trail.length).toBe(6)
    const v = trail.verify()
    expect(v.valid).toBe(true)
    expect(v.brokenAt).toBeNull()
    expect(v.checked).toBe(6)
  })

  it('links every record to the previous hash; head advances; genesis when empty', async () => {
    const empty = new AuditTrail(SESSION)
    expect(empty.headHash()).toBe(GENESIS_HASH)

    const trail = await buildLifecycleChain()
    const recs = trail.getRecords()
    expect(recs[0].prevHash).toBe(GENESIS_HASH)
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i].prevHash).toBe(recs[i - 1].hash)
    }
    expect(trail.headHash()).toBe(recs[recs.length - 1].hash)
  })

  it('detects payload tampering at the exact record; the prefix still verifies', async () => {
    const trail = await buildLifecycleChain()
    const recs = trail.getRecords()
    // Mutate the consumer's claimed result at index 4.
    recs[4] = { ...recs[4], payload: { ...recs[4].payload, result: 999.9 } }
    const v = AuditTrail.verifyRecords(recs)
    expect(v.valid).toBe(false)
    expect(v.brokenAt).toBe(4)
    expect(v.reason).toBe('hash_mismatch')
    // Everything before the break is unaffected.
    expect(AuditTrail.verifyRecords(recs.slice(0, 4)).valid).toBe(true)
  })

  it('rejects a forged signature even when the hash is recomputed to match', async () => {
    const trail = await buildLifecycleChain()
    const recs = trail.getRecords()
    // Contents + hash intact, but the signature is replaced with an attacker's.
    const attacker = derivePartyWallet(BASE, 'attacker', 'x')
    const forged = await signHash(attacker.privateKey, recs[2].hash)
    recs[2] = { ...recs[2], signature: forged }
    const v = AuditTrail.verifyRecords(recs)
    expect(v.valid).toBe(false)
    expect(v.brokenAt).toBe(2)
    expect(v.reason).toBe('signature_invalid')
  })

  it('detects reordering of records', async () => {
    const trail = await buildLifecycleChain()
    const recs = trail.getRecords()
    const swapped = [...recs]
    const tmp = swapped[2]
    swapped[2] = swapped[4]
    swapped[4] = tmp
    const v = AuditTrail.verifyRecords(swapped)
    expect(v.valid).toBe(false)
    expect(v.brokenAt).toBe(2)
    expect(v.reason).toBe('bad_index')
  })

  it('detects a replayed (duplicated) record', async () => {
    const trail = await buildLifecycleChain()
    const recs = trail.getRecords()
    const replayed = [...recs, recs[1]] // replay node1's attestation at the tail
    const v = AuditTrail.verifyRecords(replayed)
    expect(v.valid).toBe(false)
    expect(v.brokenAt).toBe(recs.length)
    expect(v.reason).toBe('bad_index')
  })

  it('detects deletion of a middle record', async () => {
    const trail = await buildLifecycleChain()
    const recs = trail.getRecords()
    const pruned = [...recs.slice(0, 3), ...recs.slice(4)] // drop index 3
    const v = AuditTrail.verifyRecords(pruned)
    expect(v.valid).toBe(false)
    expect(v.brokenAt).toBe(3)
    expect(v.reason).toBe('bad_index')
  })

  it('flags a first record that does not link to genesis', async () => {
    const trail = await buildLifecycleChain()
    const recs = trail.getRecords()
    recs[0] = { ...recs[0], prevHash: '0x' + 'f'.repeat(64) }
    const v = AuditTrail.verifyRecords(recs)
    expect(v.valid).toBe(false)
    expect(v.brokenAt).toBe(0)
    expect(v.reason).toBe('genesis_mismatch')
  })

  it('is deterministic: identical inputs produce identical hashes', async () => {
    const a = await buildLifecycleChain()
    const b = await buildLifecycleChain()
    expect(a.getRecords().map((r) => r.hash)).toEqual(b.getRecords().map((r) => r.hash))
    expect(a.headHash()).toBe(b.headHash())
  })

  it('canonicalization is independent of property insertion order', () => {
    const h1 = computeRecordHash({
      index: 0,
      sessionId: 's',
      timestamp: 1,
      party: 'provider',
      actor: '0x0',
      event: 'e',
      payload: { a: 1, b: 2 },
      prevHash: GENESIS_HASH,
    })
    const h2 = computeRecordHash({
      prevHash: GENESIS_HASH,
      payload: { b: 2, a: 1 },
      event: 'e',
      actor: '0x0',
      party: 'provider',
      timestamp: 1,
      sessionId: 's',
      index: 0,
    })
    expect(h1).toBe(h2)
    expect(canonicalize({ b: 2, a: 1 })).toBe('{"a":1,"b":2}')
  })
})
