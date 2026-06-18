/**
 * Summary statistics for benchmark replicates (thesis B1 / QE4.2).
 *
 * Each (backend x query x payload) cell is run >= 10 times; we report the mean
 * and a 95% confidence interval using the Student-t critical value for n-1
 * degrees of freedom (the normal 1.96 is only valid for large n).
 */

export interface Summary {
  n: number
  mean: number
  sd: number
  /** Half-width of the 95% CI. */
  ci95: number
  ciLow: number
  ciHigh: number
  min: number
  max: number
}

// Two-sided 95% Student-t critical values, indexed by degrees of freedom.
const T95: Array<[number, number]> = [
  [1, 12.706], [2, 4.303], [3, 3.182], [4, 2.776], [5, 2.571],
  [6, 2.447], [7, 2.365], [8, 2.306], [9, 2.262], [10, 2.228],
  [12, 2.179], [15, 2.131], [20, 2.086], [24, 2.064], [30, 2.042],
  [40, 2.021], [60, 2.0], [120, 1.98],
]

/** Conservative 95% t critical value for `df` degrees of freedom (>=1.96). */
export function tCrit95(df: number): number {
  if (df <= 0) return NaN
  for (const [d, t] of T95) if (df <= d) return t
  return 1.96 // large-sample normal approximation
}

export function summarize(samples: number[]): Summary {
  const n = samples.length
  if (n === 0) return { n: 0, mean: NaN, sd: NaN, ci95: NaN, ciLow: NaN, ciHigh: NaN, min: NaN, max: NaN }
  let sum = 0
  let min = Infinity
  let max = -Infinity
  for (const x of samples) {
    sum += x
    if (x < min) min = x
    if (x > max) max = x
  }
  const mean = sum / n
  let ss = 0
  for (const x of samples) ss += (x - mean) * (x - mean)
  const sd = n > 1 ? Math.sqrt(ss / (n - 1)) : 0
  const ci95 = n > 1 ? (tCrit95(n - 1) * sd) / Math.sqrt(n) : 0
  return { n, mean, sd, ci95, ciLow: mean - ci95, ciHigh: mean + ci95, min, max }
}
