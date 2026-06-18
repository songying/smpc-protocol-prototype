import { NextRequest, NextResponse } from 'next/server'
import { AuditTrail } from '@/lib/audit'
import { buildLifecycleTrail } from '@/lib/audit/lifecycle'
import { loadTrail } from '@/lib/audit/store'

/**
 * Audit-trail verification endpoint (thesis B4 / QE2.2).
 *
 *   GET /api/demo/audit?sessionId=<id>          -> the persisted chain + verification
 *   GET /api/demo/audit?sessionId=<id>&tamper=k -> re-verify with record k mutated (shows detection)
 *   GET /api/demo/audit                          -> a self-contained demo: intact chain + tamper detection
 *
 * The demo mode needs no Redis or chain, so the tamper-evidence property is
 * always demonstrable (the proof-of-concept promised at the defense, Figure 5).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const tamper = searchParams.get('tamper')

  if (sessionId) {
    const trail = await loadTrail(sessionId)
    if (!trail) {
      return NextResponse.json(
        { error: `no audit trail found for session ${sessionId}` },
        { status: 404 }
      )
    }
    const records = trail.getRecords()
    if (tamper != null) {
      const k = parseInt(tamper, 10)
      const mutated = records.map((r) => ({ ...r, payload: { ...r.payload } }))
      if (k >= 0 && k < mutated.length) {
        mutated[k] = { ...mutated[k], payload: { ...mutated[k].payload, _tampered: true } }
      }
      return NextResponse.json({
        sessionId,
        tamperAt: k,
        recordCount: mutated.length,
        verification: AuditTrail.verifyRecords(mutated),
      })
    }
    return NextResponse.json({
      sessionId,
      recordCount: records.length,
      headHash: trail.headHash(),
      verification: trail.verify(),
      records,
    })
  }

  // Demo mode — self-contained, no Redis required.
  const trail = await buildLifecycleTrail({
    sessionId: 'demo_endpoint_sample',
    datasetId: 'demo',
    provider: { dataHash: '0xabc123', category: 'health' },
    aggregation: {
      operation: 'mean',
      result: 70.3,
      recordCount: 10,
      nodes: [
        { nodeId: '1', shareIndex: 1, shareCount: 10, partial: '111' },
        { nodeId: '2', shareIndex: 2, shareCount: 10, partial: '222' },
        { nodeId: '3', shareIndex: 3, shareCount: 10, partial: '333' },
      ],
      live: false,
    },
    settlement: { txHash: '0xdef456' },
    base: 'demo-audit-endpoint',
  })

  const intact = trail.verify()
  const mutated = trail.getRecords().map((r) => ({ ...r, payload: { ...r.payload } }))
  const k = Math.min(4, mutated.length - 1)
  mutated[k] = { ...mutated[k], payload: { ...mutated[k].payload, result: 0.0 } }
  const afterTamper = AuditTrail.verifyRecords(mutated)

  return NextResponse.json({
    mode: 'demo',
    recordCount: trail.length,
    headHash: trail.headHash(),
    intact,
    tamperAt: k,
    afterTamper,
    records: trail.getRecords(),
  })
}
