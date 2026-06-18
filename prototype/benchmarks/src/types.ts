/**
 * Shared types for the comparative benchmark harness (thesis B1 / QE4.2).
 *
 * The harness runs an identical, fixed workload across four backends and
 * captures latency, correctness, and resource use per cell. A backend is an
 * adapter implementing this interface; only `centralized` is implemented in the
 * scaffold — `our-protocol`, `fhe` (OpenFHE) and `tee` (SGX) land in Tier 1
 * once the production-real pipeline (B-MPC) and L2 deploy (B0) are in place.
 */

export type QueryName = 'sum' | 'mean' | 'max' | 'quantile' | 'logreg'

export interface QuerySpec {
  name: QueryName
  /** Quantile q in [0,1] for the 'quantile' query; ignored otherwise. */
  param?: number
}

export interface Dataset {
  schema: 'numeric_v1'
  seed: number
  size: number
  /** Primary numeric column (sum / mean / max / quantile). */
  values: number[]
  /** Two-feature design matrix for the logistic-regression fit. */
  features: number[][]
  /** Binary labels for the logistic-regression fit. */
  labels: number[]
}

/** A scalar (sum/mean/max/quantile) or a vector (logreg weights [w0, w1, b]). */
export type QueryValue = number | number[]

/** Where a backend's privacy guarantee comes from — stated per backend (QE4.2). */
export type TrustAssumption =
  | 'information-theoretic' // our protocol: Shamir t-of-n, shares reveal nothing
  | 'computational' // FHE: hardness of the underlying lattice problem
  | 'hardware-vendor' // TEE: trust in the enclave manufacturer
  | 'none (plaintext)' // centralized: no privacy — lower-bound baseline

export interface Backend {
  readonly name: string
  readonly trustAssumption: TrustAssumption
  /** True when this backend can run in the current environment (deps/hardware present). */
  available(): Promise<boolean>
  /** Optional: whether this backend can perform a query (e.g. additive SSS only does sum/mean). Absent ⇒ all. */
  supports?(query: QuerySpec): boolean
  /** Execute one query over one dataset, returning the numeric result. */
  run(query: QuerySpec, data: Dataset): Promise<QueryValue>
}
