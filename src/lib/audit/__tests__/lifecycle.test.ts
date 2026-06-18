/**
 * Tests for the lifecycle trail builder (B4 wiring): a full trade produces a
 * verifiable chain, and tampering with any stage is detected at that stage.
 */

import { buildLifecycleTrail } from '@/lib/audit/lifecycle'
import { AuditTrail } from '@/lib/audit'

const params = {
  sessionId: 's1',
  datasetId: 'd1',
  provider: { dataHash: '0xabc', category: 'health', txHash: '0xreg' },
  aggregation: {
    operation: 'mean',
    result: 70.3,
    recordCount: 10,
    nodes: [
      { nodeId: '1', shareIndex: 1, shareCount: 10, partial: '11' },
      { nodeId: '2', shareIndex: 2, shareCount: 10, partial: '22' },
      { nodeId: '3', shareIndex: 3, shareCount: 10, partial: '33' },
    ],
    live: true,
  },
  settlement: { txHash: '0xset', total: '0.01' },
  base: 'lifecycle-test-base',
}

describe('buildLifecycleTrail (B4 wiring)', () => {
  it('produces a verifiable provider→nodes→consumer→validator chain', async () => {
    const trail = await buildLifecycleTrail(params)
    expect(trail.length).toBe(6) // provider + 3 nodes + consumer + validator
    expect(trail.verify().valid).toBe(true)
    const parties = trail.getRecords().map((r) => r.party)
    expect(parties).toEqual(['provider', 'compute_node', 'compute_node', 'compute_node', 'consumer', 'validator'])
  })

  it('detects tampering with a node partial at the exact record', async () => {
    const trail = await buildLifecycleTrail(params)
    const recs = trail.getRecords().map((r) => ({ ...r, payload: { ...r.payload } }))
    recs[2] = { ...recs[2], payload: { ...recs[2].payload, partial: '999' } }
    const v = AuditTrail.verifyRecords(recs)
    expect(v.valid).toBe(false)
    expect(v.brokenAt).toBe(2)
    expect(v.reason).toBe('hash_mismatch')
  })

  it('signs each party with a distinct, attributable address', async () => {
    const trail = await buildLifecycleTrail(params)
    const actors = new Set(trail.getRecords().map((r) => r.actor))
    expect(actors.size).toBe(6) // every party/node gets its own derived signer
  })
})
