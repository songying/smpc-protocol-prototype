/**
 * Fixed, reproducible workload for the comparative benchmark (thesis B1 / QE4.2).
 *
 * The same synthetic dataset (identical schema + seed) and the same five queries
 * run against every backend, so latency is compared on like-for-like work. The
 * reference (plaintext) implementations here are also the CORRECTNESS ORACLE:
 * before any timing is trusted, each backend's result must match these within
 * tolerance (FHE introduces approximate-arithmetic error).
 */

import type { Dataset, QuerySpec, QueryValue } from './types'

/** Standard payload sizes (record counts) used across the benchmark. */
export const PAYLOADS = [1_000, 10_000, 100_000, 500_000]

/** The five fixed queries. */
export const QUERIES: QuerySpec[] = [
  { name: 'sum' },
  { name: 'mean' },
  { name: 'max' },
  { name: 'quantile', param: 0.95 },
  { name: 'logreg' },
]

/** Small, fast, deterministic PRNG (mulberry32) so datasets are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Generate a dataset of `size` records with a fixed seed (same across backends). */
export function generateDataset(size: number, seed = 42): Dataset {
  const rnd = mulberry32(seed)
  const values: number[] = new Array(size)
  const features: number[][] = new Array(size)
  const labels: number[] = new Array(size)
  for (let i = 0; i < size; i++) {
    values[i] = Math.round(rnd() * 1000)
    const x1 = rnd() * 2 - 1
    const x2 = rnd() * 2 - 1
    features[i] = [x1, x2]
    const z = 1.5 * x1 - 2.0 * x2 // ground-truth logistic relationship
    const p = 1 / (1 + Math.exp(-z))
    labels[i] = rnd() < p ? 1 : 0
  }
  return { schema: 'numeric_v1', seed, size, values, features, labels }
}

// --- Reference (plaintext) implementations: the correctness oracle ---------

function sumOf(v: number[]): number {
  let s = 0
  for (let i = 0; i < v.length; i++) s += v[i]
  return s
}

function maxOf(v: number[]): number {
  let m = -Infinity
  for (let i = 0; i < v.length; i++) if (v[i] > m) m = v[i]
  return m
}

function quantileOf(v: number[], q: number): number {
  const s = v.slice().sort((a, b) => a - b)
  const idx = Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))
  return s[idx]
}

/** Plain-batch-gradient-descent logistic regression; returns [w0, w1, bias]. */
function logisticRegression(X: number[][], y: number[], epochs = 200, lr = 0.1): number[] {
  let w0 = 0
  let w1 = 0
  let b = 0
  const n = X.length
  for (let e = 0; e < epochs; e++) {
    let gw0 = 0
    let gw1 = 0
    let gb = 0
    for (let i = 0; i < n; i++) {
      const z = w0 * X[i][0] + w1 * X[i][1] + b
      const p = 1 / (1 + Math.exp(-z))
      const err = p - y[i]
      gw0 += err * X[i][0]
      gw1 += err * X[i][1]
      gb += err
    }
    w0 -= (lr * gw0) / n
    w1 -= (lr * gw1) / n
    b -= (lr * gb) / n
  }
  return [w0, w1, b]
}

/** Compute the reference (ground-truth) result for a query over a dataset. */
export function referenceResult(query: QuerySpec, d: Dataset): QueryValue {
  switch (query.name) {
    case 'sum':
      return sumOf(d.values)
    case 'mean':
      return d.size > 0 ? sumOf(d.values) / d.size : 0
    case 'max':
      return maxOf(d.values)
    case 'quantile':
      return quantileOf(d.values, query.param ?? 0.5)
    case 'logreg':
      return logisticRegression(d.features, d.labels)
  }
}

/** Relative-error comparison that tolerates FHE approximate arithmetic. */
export function withinTolerance(actual: QueryValue, expected: QueryValue, relTol = 1e-6): boolean {
  const a = Array.isArray(actual) ? actual : [actual]
  const e = Array.isArray(expected) ? expected : [expected]
  if (a.length !== e.length) return false
  for (let i = 0; i < a.length; i++) {
    const denom = Math.max(1, Math.abs(e[i]))
    if (Math.abs(a[i] - e[i]) / denom > relTol) return false
  }
  return true
}
