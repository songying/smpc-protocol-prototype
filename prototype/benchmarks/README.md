# Comparative Benchmark Harness (B1 / QE4.2)

> Replaces the thesis's *directional* performance inference with **measured,
> comparative** data across four backends, plus a stress matrix — the rigor
> Prof. Cheng asked for in QE4.2. Feeds Figures 1–3 and the Ch.6 comparison
> tables. Numbers must reconcile with `docs/dsr-5.md`.

## Backends (4)

| Backend | What it is | Trust assumption | Status |
|---|---|---|---|
| `centralized` | Single-node in-memory plaintext — latency lower bound (no privacy) | none (plaintext) | ✅ implemented (scaffold) |
| `our-protocol` | Arbitrum L2 + MP-SPDZ Shamir pipeline | information-theoretic (t-of-n) | ⏳ Tier 1 — needs B-MPC (real MP-SPDZ) + B0 (L2 deploy) |
| `fhe` | OpenFHE — CKKS (approx-numeric), BGV/BFV (exact integer) | computational (lattice) | ⏳ Tier 1 |
| `tee` | Gramine + Intel SGX, or Azure Confidential Computing if no SGX hardware | hardware-vendor | ⏳ Tier 1 (record which mode) |

A backend is an adapter implementing the `Backend` interface in `src/types.ts`.
The harness runs only backends whose `available()` returns true, so the scaffold
runs end-to-end today on `centralized` and skips the rest cleanly.

## Workload (identical across all backends)

- **Queries:** `sum`, `mean`, `max`, `quantile(0.95)`, and a `logreg` fit.
- **Payloads:** 1k / 10k / 100k / 500k records, **same schema + seed** (`workload.ts`).
- **Reference oracle:** the plaintext implementations in `workload.ts` define the
  correct answer; every backend is checked against them (FHE within tolerance).

## Statistics

≥10 replicates per (backend × query × payload) cell; report **mean ± 95% CI**
using the Student-t critical value for n−1 df (`stats.ts`). Pin CPU/RAM and
record the machine spec in the Test Report.

## Stress matrix (Tier 1)

Concurrency ∈ {1, 10, 50, 100} × payload ∈ {1k, 10k, 100k, 500k}; report latency
and throughput per cell. Added with the real backends.

## Run

```bash
# full run (default: 10 reps, payloads 1k/10k/100k/500k)
npx tsx prototype/benchmarks/src/harness.ts

# quick smoke run
BENCH_REPS=3 BENCH_PAYLOADS=1000,10000 npx tsx prototype/benchmarks/src/harness.ts
```

Outputs: `results/bench_raw.csv` (every replicate) and `results/bench_summary.csv`
(mean ± CI per cell). See `TESTING.md` for the correctness gate and reproducibility
contract.

## Layout

```
prototype/benchmarks/
  README.md            this file (development doc)
  TESTING.md           correctness gate, reproducibility, validity threats
  src/
    types.ts           Backend interface + workload types
    workload.ts        seeded data generator + reference (oracle) queries
    stats.ts           mean ± 95% CI (Student-t)
    backends/
      centralized.ts   implemented plaintext lower bound
      index.ts         registry (+ Tier-1 stubs: our-protocol / fhe / tee)
    harness.ts         runs cells, enforces correctness gate, writes CSVs
  results/             generated CSVs (git-ignored except headers if desired)
```
