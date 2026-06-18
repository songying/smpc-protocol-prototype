# Benchmark & Audit Test Report

> Standalone, reproducible test report for the thesis prototype (revision items
> **B1** comparative benchmark / QE4.2 and **B4** tamper-evident audit / QE2.2).
> Intended as **Appendix F** of the thesis. The main Chapter 6 summarises the
> headline tables and cross-references this report for full method and raw data.
> Generated 2026-06-13.

---

## 1. Objective & scope

This report establishes, by measurement rather than directional inference (the
QE4.2 ask):

1. The **comparative latency** of the thesis's privacy-preserving protocol against
   a fully-homomorphic-encryption backend and a non-private plaintext lower bound,
   on an identical workload, with confidence intervals.
2. The **tamper-evidence** of the hardened audit trail (B4): that any mutation,
   reordering, deletion, or replay of an audit record is detected at the exact
   point it occurs.

**What it does NOT claim.** It is not a production-throughput study, not a claim
about arbitrary workloads, and not a market or organizational-adoption result
(those remain the n=10 formative expert study). Coverage limits are stated
explicitly in §5 and §6 rather than hidden.

---

## 2. Test environment

| Item | Value |
|---|---|
| Machine | Apple M4, 10 cores, 32 GB RAM |
| OS | macOS (Darwin 25.3.0, arm64) |
| Runtime | Node.js v22.22.0 |
| FHE library | node-seal 5.1.7 (Microsoft SEAL, WASM) |
| SMPC library | project `ShamirSecretSharing` (`src/lib/mkfhe/dkg/shamir.ts`), prime 2³¹−1, (t=2, n=3) |
| Replicates | 10 per cell |
| Dataset seed | 42 (deterministic mulberry32; identical data across backends) |

**FHE parameters (recorded for reproducibility):** BFV scheme, polynomial modulus
degree 8192, coefficient modulus {60,40,40,60} bits, plaintext modulus via
`PlainModulus.Batching(8192, 20)`, 128-bit security (`tc128`), SIMD batch encoding.

> **Substitution note (QE4.2 honesty):** the revision plan specified OpenFHE for
> the FHE backend; this report uses Microsoft SEAL via node-seal so the benchmark
> runs without a native C++ toolchain. Both are standard RLWE FHE libraries; the
> exact scheme and parameters above make the result reproducible and comparable.

---

## 3. Methodology

- **Workload (identical across backends):** queries `sum`, `mean`, `max`,
  `quantile(0.95)`, and a logistic-regression fit (`logreg`), over synthetic
  datasets of 1k / 10k / 100k / 500k records (same schema + seed).
- **Backends (4):**
  - `centralized` — single-node in-memory plaintext (latency lower bound; no privacy).
  - `our-protocol` — the thesis's Shamir secure aggregation (t=2, n=3), reusing the
    live orchestrator's implementation; measured in-process (the cryptographic cost).
  - `fhe` — SEAL BFV batched homomorphic aggregation (server never sees plaintext).
  - `tee` — **not measured** in this report; documented as future work (no SGX
    hardware / Azure CC in the test environment). Recorded here so coverage is explicit.
- **Correctness gate (runs before timing is trusted):** every backend's result is
  compared to the plaintext oracle within tolerance; a cell that fails is excluded
  from headline comparison. All measured cells below passed (`correct=true`).
- **Capability coverage (stated, not hidden):** additive secret sharing and BFV
  natively support *linear aggregates*, so `our-protocol` and `fhe` report `sum`
  and `mean`. `max`/`quantile` (comparisons) and `logreg` (deep multiplicative
  depth) require comparison/garbled-circuit machinery (MP-SPDZ) or CKKS with
  bootstrapping — reported as **unsupported in this iteration** rather than faked,
  and listed as future work.
- **Statistics:** mean ± 95% confidence interval using the Student-t critical value
  for n−1 degrees of freedom.
- **Network / on-chain cost:** `our-protocol` figures are the in-process crypto
  cost; node-to-node network latency and on-chain (L2) settlement gas are measured
  separately (item B0) and reported as *projected* pending a funded testnet key.

---

## 4. Procedure (one-command reproduction)

```bash
# full benchmark (10 reps, payloads 1k/10k/100k/500k) -> results/*.csv
npx tsx prototype/benchmarks/src/harness.ts

# quick smoke
BENCH_REPS=3 BENCH_PAYLOADS=1000,10000 npx tsx prototype/benchmarks/src/harness.ts

# audit tamper-detection demo -> prototype/reports/audit-tamper-demo.json
npx tsx scripts/audit-tamper-demo.ts

# audit unit + tamper tests
npx jest --config jest.config.cjs src/lib/audit
```

---

## 5. Results

### 5.1 Comparative latency — linear aggregates (`sum`), mean ± 95% CI (ms), n=10

| Backend | Trust assumption | 1k | 10k | 100k | 500k |
|---|---|--:|--:|--:|--:|
| centralized | none (plaintext) | 0.016 ± 0.004 | 0.010 ± 0.010 | 0.047 ± 0.002 | 0.228 ± 0.001 |
| fhe (SEAL BFV) | computational | 4.324 ± 0.467 | 7.324 ± 0.140 | 42.514 ± 0.041 | 200.196 ± 0.389 |
| our-protocol (Shamir t=2,n=3) | information-theoretic | 1.868 ± 0.609 | 13.816 ± 0.117 | 138.664 ± 0.577 | 697.497 ± 0.999 |

`mean` mirrors `sum` (centralized 0.229, fhe 199.5, our-protocol 701.2 ms at 500k).

**Reading of the result.** At 500k records the privacy cost is explicit and bounded:
FHE is ~878× the plaintext lower bound, the Shamir protocol ~3060×. FHE overtakes
the SMPC protocol at scale (≈3.5× faster at 500k) because BFV amortises across 8192
SIMD slots, whereas the SMPC cost is dominated by per-value share generation. Both
remain sub-second at half a million records — i.e. the privacy guarantee is
affordable for batch analytics, which is the thesis's operating regime. The SMPC
protocol scales near-linearly (1.4 ms → 697 ms across a 500× data increase).

### 5.2 Plaintext-only queries (coverage baseline), mean ± 95% CI (ms), n=10

| Query | 1k | 10k | 100k | 500k |
|---|--:|--:|--:|--:|
| max | 0.013 ± 0.008 | 0.019 ± 0.017 | 0.092 ± 0.002 | 0.454 ± 0.001 |
| quantile(0.95) | 0.078 ± 0.010 | 1.007 ± 0.008 | 11.885 ± 0.443 | 61.495 ± 0.475 |
| logreg | 0.974 ± 0.033 | 12.276 ± 0.040 | 168.771 ± 0.824 | 871.304 ± 2.529 |

These establish the workload's plaintext cost; the private equivalents
(max/quantile via MP-SPDZ, logreg via CKKS) are scoped as future work.

### 5.3 Audit-trail tamper detection (B4 / QE2.2)

A 6-record trade-lifecycle chain (provider → 3 compute nodes → consumer →
validator), each record a signed, hash-chained attestation:

| Scenario | Result |
|---|---|
| Intact chain | `valid = true`, all 6 records verify |
| Mutate record k=4 (consumer result 70.3 → 0.0) | `valid = false`, **brokenAt = 4**, reason `hash_mismatch` |
| Records [0..3] after the break | still verify (`valid = true`) — tamper localised |
| Reorder / delete a record | detected (`bad_index` / `broken_link`) |
| Forge a signature | detected (`signature_invalid`) |
| Replay a record | detected (`bad_index`) |

13/13 unit + tamper tests pass (`src/lib/audit`). The full intact-vs-tampered
per-record breakdown is emitted to `prototype/reports/audit-tamper-demo.json`
(thesis Figure 5).

### 5.4 Zero-knowledge verification — Groth16 (B-ZK / QE2.2)

A real Groth16 proof for the verifiable-aggregation circuit (`circuits/sum.circom`:
ten private addends must sum to a public total) was generated with snarkjs and
checked on-chain by the snarkjs-exported `contracts/Groth16Verifier.sol`:

| Property | Result |
|---|---|
| Off-chain proof | generated; `snarkjs groth16 verify` → OK |
| On-chain verification gas | **213,720 gas (measured)** — constant in statement size |
| Tampered public input | verification returns `false` (rejected) |

The measured 213,720 gas sits inside the protocol-determined band (Groth16 is a
single pairing check; EIP-1108 fixes the pairing cost) and **replaces the earlier
~280k estimate with a self-measured figure** for this circuit. The verifier is
deployed by `scripts/deploy.cjs`; reproduce via the pipeline in `docs/clicmd.md`.

### 5.5 Concurrency stress matrix

Throughput for the `sum` query across concurrency {1,10,50,100} × payload
{1k,10k,100k} (`stress_matrix.csv`, Figure 6). Headline (at 100k records):

| Backend | throughput @100k (q/s) |
|---|--:|
| centralized (plaintext) | ~20,700 |
| fhe (SEAL BFV) | ~24 |
| our-protocol (Shamir) | ~7.2 |

Throughput is **flat across concurrency** for the privacy backends: they are
CPU-bound and execute in a single Node process, so concurrent requests serialize
on one event loop and per-cell latency grows linearly with concurrency. Reported
honestly: on a single node, throughput is bounded by per-operation cost — scaling
is a horizontal (multi-node) property, not a concurrency one.

---

## 6. Threats to validity & limitations

- **JIT / GC jitter:** mitigated by 10 replicates and reported CIs; warm-up runs
  are not discarded (documented). Wide CI at 1k for `our-protocol`/`fhe` reflects
  first-call JIT/WASM warm-up, which the larger payloads amortise.
- **Single machine:** all figures are from one Apple-M4 host; absolute numbers are
  machine-dependent — the *ratios* between backends are the portable result.
- **In-process SMPC:** `our-protocol` measures cryptographic cost only; network and
  on-chain costs are reported separately (B0) and currently projected.
- **FHE scope:** BFV exact-integer linear aggregates only; CKKS approximate and
  encrypted logreg are future work. Memory (`peak_rss_mb` in the raw CSV) is an
  indicative process snapshot, not an isolated per-backend profile.
- **TEE not measured:** no SGX/Azure-CC in the environment; documented as future work.

---

## 7. Raw-data appendix

- `prototype/benchmarks/results/bench_raw.csv` — every replicate (backend, query, payload, rep, latency_ms, correct).
- `prototype/benchmarks/results/bench_summary.csv` — per-cell mean ± 95% CI, min/max, indicative RSS, correctness.
- `prototype/reports/audit-tamper-demo.json` — audit intact-vs-tampered per-record verification (Figure 5 data).
