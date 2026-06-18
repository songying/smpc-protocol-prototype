/**
 * Standalone tamper-detection demonstration for the audit trail (thesis B4 / QE2.2).
 *
 * Builds a realistic trade-lifecycle chain of signed, hash-chained attestations,
 * verifies it intact, then tampers with one record and shows that verification
 * pinpoints the exact break — and that every record after the break is
 * invalidated while the prefix before it stays valid. Emits a JSON artifact for
 * thesis Figure 5 (events -> hash-chained records -> signatures; tamper at t=k
 * breaks t>=k).
 *
 * Run:  npx tsx scripts/audit-tamper-demo.ts
 * Out:  prototype/reports/audit-tamper-demo.json
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { AuditTrail, derivePartyWallet, type AuditRecord } from '../src/lib/audit'

const BASE = 'figure5-demo-base'
const SESSION = 'demo_lifecycle'

async function buildChain(): Promise<AuditTrail> {
  const provider = derivePartyWallet(BASE, 'provider', 'p1')
  const node1 = derivePartyWallet(BASE, 'compute_node', 'n1')
  const node2 = derivePartyWallet(BASE, 'compute_node', 'n2')
  const node3 = derivePartyWallet(BASE, 'compute_node', 'n3')
  const consumer = derivePartyWallet(BASE, 'consumer', 'c1')
  const validator = derivePartyWallet(BASE, 'validator', 'v1')

  const trail = new AuditTrail(SESSION)
  let t = 1_700_000_000_000
  await trail.append({ party: 'provider', event: 'data_registered', privateKey: provider.privateKey, timestamp: t++, payload: { dataHash: '0xabc123', consentScope: 'aggregate-only', purpose: 'population-health-research' } })
  await trail.append({ party: 'compute_node', event: 'shares_received', privateKey: node1.privateKey, timestamp: t++, payload: { node: 1, shareCommitment: '0x111' } })
  await trail.append({ party: 'compute_node', event: 'shares_received', privateKey: node2.privateKey, timestamp: t++, payload: { node: 2, shareCommitment: '0x222' } })
  await trail.append({ party: 'compute_node', event: 'compute_finished', privateKey: node3.privateKey, timestamp: t++, payload: { node: 3, partial: '9988', resultHash: '0xdef456' } })
  await trail.append({ party: 'consumer', event: 'result_acknowledged', privateKey: consumer.privateKey, timestamp: t++, payload: { fn: 'mean', result: 70.3 } })
  await trail.append({ party: 'validator', event: 'compliance_checked', privateKey: validator.privateKey, timestamp: t++, payload: { passed: true, violations: 0 } })
  return trail
}

/** Per-record validity: a record is "valid" iff the chain verifies up to and including it. */
function perRecordValidity(records: AuditRecord[]): boolean[] {
  return records.map((_, i) => AuditTrail.verifyRecords(records.slice(0, i + 1)).valid)
}

async function main() {
  const trail = await buildChain()
  const original = trail.getRecords()
  const before = trail.verify()

  // Tamper: silently alter the result a malicious party reports, at record k=4.
  const k = 4
  const tampered = original.map((r) => ({ ...r, payload: { ...r.payload } }))
  tampered[k] = { ...tampered[k], payload: { ...tampered[k].payload, result: 0.0 } }
  const after = AuditTrail.verifyRecords(tampered)

  const artifact = {
    title: 'Audit-trail tamper detection (Figure 5)',
    sessionId: SESSION,
    recordCount: original.length,
    headHash: trail.headHash(),
    parties: original.map((r) => ({ index: r.index, party: r.party, event: r.event, actor: r.actor })),
    intact: { verification: before, perRecordValid: perRecordValidity(original) },
    tampered: { atIndex: k, mutation: 'consumer result 70.3 -> 0.0', verification: after, perRecordValid: perRecordValidity(tampered) },
  }

  const outPath = resolve(process.cwd(), 'prototype/reports/audit-tamper-demo.json')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(artifact, null, 2))

  console.log(`Chain of ${original.length} signed records, head ${trail.headHash().slice(0, 18)}...`)
  console.log(`  intact   -> valid=${before.valid} brokenAt=${before.brokenAt}`)
  console.log(`  tamper@${k} -> valid=${after.valid} brokenAt=${after.brokenAt} reason=${after.reason}`)
  console.log(`  prefix [0..${k - 1}] still valid: ${AuditTrail.verifyRecords(tampered.slice(0, k)).valid}`)
  console.log(`Figure-5 data written to ${outPath}`)

  if (before.valid && !after.valid && after.brokenAt === k) process.exit(0)
  console.error('UNEXPECTED: tamper-detection demo did not behave as expected')
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
