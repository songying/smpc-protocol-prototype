/**
 * Comparative benchmark harness (thesis B1 / QE4.2).
 *
 * Runs the fixed workload (every query x every payload) against each AVAILABLE
 * backend, >= BENCH_REPS replicates per cell. For each cell it enforces a
 * correctness gate (result must match the plaintext oracle within tolerance —
 * otherwise the latency comparison is meaningless), captures wall-clock latency
 * and an indicative RSS snapshot, and writes raw + summary CSVs.
 *
 * Run:   npx tsx prototype/benchmarks/src/harness.ts
 * Env:   BENCH_REPS=10   BENCH_PAYLOADS=1000,10000   (override for quick smoke runs)
 * Out:   prototype/benchmarks/results/{bench_raw.csv, bench_summary.csv}
 */

import { mkdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { performance } from 'perf_hooks'
import type { Dataset, QuerySpec } from './types'
import { PAYLOADS, QUERIES, generateDataset, referenceResult, withinTolerance } from './workload'
import { summarize } from './stats'
import { ALL_BACKENDS } from './backends'

const REPS = Number(process.env.BENCH_REPS || 10)
const PAYLOAD_SET = process.env.BENCH_PAYLOADS
  ? process.env.BENCH_PAYLOADS.split(',').map((s) => Number(s.trim()))
  : PAYLOADS
const RESULTS_DIR = resolve(process.cwd(), 'prototype/benchmarks/results')

function qlabel(q: QuerySpec): string {
  return q.param != null ? `${q.name}(${q.param})` : q.name
}
function fix(n: number): string {
  return Number.isFinite(n) ? n.toFixed(3) : 'NA'
}

async function main() {
  mkdirSync(RESULTS_DIR, { recursive: true })

  // Same dataset (schema + seed) for every backend, generated once per payload.
  const datasets = new Map<number, Dataset>()
  for (const p of PAYLOAD_SET) datasets.set(p, generateDataset(p))

  const rawRows: string[] = ['backend,query,payload,rep,latency_ms,correct']
  const summaryRows: string[] = [
    'backend,query,payload,trust,n,mean_ms,ci95_ms,min_ms,max_ms,peak_rss_mb,correct',
  ]

  for (const backend of ALL_BACKENDS) {
    if (!(await backend.available())) {
      console.log(`skip ${backend.name} — unavailable in this environment (Tier-1 work)`)
      continue
    }
    for (const query of QUERIES) {
      for (const p of PAYLOAD_SET) {
        if (backend.supports && !backend.supports(query)) {
          console.log(`  - ${backend.name} ${qlabel(query)} @${p}: unsupported by this backend (skipped)`)
          continue
        }
        const data = datasets.get(p)!
        const expected = referenceResult(query, data)
        const samples: number[] = []
        let correct = true
        try {
          for (let rep = 0; rep < REPS; rep++) {
            const t0 = performance.now()
            const result = await backend.run(query, data)
            const dt = performance.now() - t0
            samples.push(dt)
            if (!withinTolerance(result, expected)) correct = false
            rawRows.push(`${backend.name},${qlabel(query)},${p},${rep},${fix(dt)},${correct}`)
          }
        } catch (err) {
          console.log(
            `  ! ${backend.name} ${qlabel(query)} @${p}: error — ${err instanceof Error ? err.message : 'failed'} (cell skipped)`
          )
          continue
        }
        const s = summarize(samples)
        const rssMb = process.memoryUsage().rss / 1e6 // indicative; true per-backend memory in Tier-1
        summaryRows.push(
          [
            backend.name,
            qlabel(query),
            p,
            backend.trustAssumption,
            s.n,
            fix(s.mean),
            fix(s.ci95),
            fix(s.min),
            fix(s.max),
            fix(rssMb),
            correct,
          ].join(',')
        )
        console.log(
          `${backend.name.padEnd(12)} ${qlabel(query).padEnd(13)} @${String(p).padStart(7)}: ` +
            `${fix(s.mean)}ms ±${fix(s.ci95)} (n=${s.n}) correct=${correct}`
        )
      }
    }
  }

  writeFileSync(resolve(RESULTS_DIR, 'bench_raw.csv'), rawRows.join('\n') + '\n')
  writeFileSync(resolve(RESULTS_DIR, 'bench_summary.csv'), summaryRows.join('\n') + '\n')
  console.log(`\nWrote ${rawRows.length - 1} raw rows + ${summaryRows.length - 1} summary rows to ${RESULTS_DIR}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
