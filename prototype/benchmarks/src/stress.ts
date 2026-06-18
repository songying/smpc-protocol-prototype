/**
 * Concurrency stress matrix (thesis B1 / QE4.2 — committed at the defense).
 *
 * For a fixed query (sum), runs each AVAILABLE backend at concurrency levels
 * {1,10,50,100} × payloads, measuring wall-clock for C concurrent operations and
 * the resulting throughput. Note: the in-process backends are CPU-bound, so
 * concurrent runs share one event loop (no true parallelism) — this measures
 * single-process behaviour under concurrent load, which the Test Report states
 * explicitly; multi-core/multi-node scaling is a deployment property.
 *
 * Run:  npx tsx prototype/benchmarks/src/stress.ts
 * Env:  STRESS_CONCURRENCY=1,10,50,100  STRESS_PAYLOADS=1000,10000,100000
 * Out:  prototype/benchmarks/results/stress_matrix.csv
 */

import { mkdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { performance } from 'perf_hooks'
import type { QuerySpec } from './types'
import { generateDataset } from './workload'
import { ALL_BACKENDS } from './backends'

const CONCURRENCY = (process.env.STRESS_CONCURRENCY || '1,10,50,100').split(',').map((s) => Number(s.trim()))
const PAYLOADS = (process.env.STRESS_PAYLOADS || '1000,10000,100000').split(',').map((s) => Number(s.trim()))
const QUERY: QuerySpec = { name: 'sum' }
const RESULTS_DIR = resolve(process.cwd(), 'prototype/benchmarks/results')

async function main() {
  mkdirSync(RESULTS_DIR, { recursive: true })
  const rows = ['backend,concurrency,payload,total_ms,mean_latency_ms,throughput_qps']

  for (const backend of ALL_BACKENDS) {
    if (!(await backend.available())) {
      console.log(`skip ${backend.name} — unavailable`)
      continue
    }
    if (backend.supports && !backend.supports(QUERY)) {
      console.log(`skip ${backend.name} — does not support ${QUERY.name}`)
      continue
    }
    for (const p of PAYLOADS) {
      const data = generateDataset(p)
      for (const c of CONCURRENCY) {
        const t0 = performance.now()
        await Promise.all(Array.from({ length: c }, () => backend.run(QUERY, data)))
        const total = performance.now() - t0
        const meanLatency = total / c
        const throughput = (c / total) * 1000 // queries per second
        rows.push(
          `${backend.name},${c},${p},${total.toFixed(3)},${meanLatency.toFixed(3)},${throughput.toFixed(2)}`
        )
        console.log(
          `${backend.name.padEnd(12)} c=${String(c).padStart(3)} @${String(p).padStart(6)}: ` +
            `total ${total.toFixed(1)}ms · ${throughput.toFixed(1)} q/s`
        )
      }
    }
  }

  writeFileSync(resolve(RESULTS_DIR, 'stress_matrix.csv'), rows.join('\n') + '\n')
  console.log(`\nWrote stress matrix (${rows.length - 1} cells) to ${RESULTS_DIR}/stress_matrix.csv`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
