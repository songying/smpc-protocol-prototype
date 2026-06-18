# SMPC Protocol — Demonstration Guide

> A working demonstrator of the **Chapter 4 "Solution Plan"** of the thesis
> *The Protocol of Privacy Data Trading and Computing with Web3* — a decentralized,
> privacy-preserving data marketplace built on Secure Multi-Party Computation (SMPC),
> homomorphic encryption, zero-knowledge proofs, and on-chain coordination.

This README explains **how to drive the live demo** and **how every step maps to the
thesis**. The platform is the Design Science Research (DSR) artifact described in
Chapter 5; this guide is what to click/run during a defense and what each result proves.

> **This repository is the clean, runnable prototype only.** It contains the source
> code, build documentation, and configuration needed to reproduce the artifact. The
> thesis manuscript and academic material are maintained separately. Because a live
> deployment requires substantial sustained compute (three SMPC node containers, a
> chain node, Redis, and a proving service), the prototype is **not hosted on a public
> network** — build and run it locally with the instructions below. Questions are
> welcome via the repository issue tracker or by contacting the author.

---

## 1. What the demonstrator shows

One click (or one API call) runs the **entire trade lifecycle** end-to-end:

1. A data provider **registers** a dataset on-chain.
2. A consumer **submits a computation request**; an auditor **approves** it.
3. Three nodes run a **real SMPC computation** on secret shares — no node ever sees the raw data.
4. A **Groth16 zero-knowledge proof** of the result is verified **on-chain**.
5. Fees are **settled on-chain** under the canonical **70 / 25 / 4 / 1** split.
6. A **tamper-evident, hash-chained audit trail** records every step.

This embodies the thesis's central commitment — **compute-to-data**: the asset traded
is a *verifiable computation result*, not the raw dataset.

---

## 2. Bring the stack up

```bash
# Production stack: caddy (HTTPS) + web + persistent chain + Redis + 3 SMPC nodes
cp .env.prod.example .env.prod          # set DOMAIN + ACME_EMAIL (use localhost for local)
./scripts/gen-secrets.sh >> .env.prod   # JWT / encryption / session secrets
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Confirm everything is healthy:

```bash
docker compose -f docker-compose.prod.yml ps      # web, caddy, redis, smpc-chain, smpc-node{1,2,3}
```

> Full deployment walkthrough (DNS, HTTPS, live-vs-simulated scope):
> [`docs/PRODUCTION_DEPLOY.md`](docs/PRODUCTION_DEPLOY.md).
> Every shell command used in this project is logged in [`docs/clicmd.md`](docs/clicmd.md).

The live behaviour is gated by two feature flags (see `.env.example`):

| Flag | Off (default dev) | On (full demo) |
|------|-------------------|----------------|
| `ENABLE_ONCHAIN` | on-chain steps are clearly-labelled simulations | real transactions on the local chain |
| `ENABLE_REAL_SMPC` | JS Shamir fallback | real **MP-SPDZ** `shamir-party.x` across 3 node containers |

With the flags off, `npm run dev` still works without a chain or nodes — every step
degrades to a labelled simulation, so the page never breaks during a talk.

---

## 3. Run the demo

### Option A — the web page (recommended for a live audience)

Open **`/demo`** (the *Secure Computation Terminal*). It presents the lifecycle as four
phases, with a **dataset selector** (finance / health / ads), an **engine label**
(MP-SPDZ vs FHE), and a **tamper toggle**. Click **Run** and watch each phase report a
real transaction hash, the computed result, the on-chain proof, the fee split, and the
audit chain.

### Option B — the API (reproducible / scriptable)

The whole lifecycle is one auth-free endpoint, `POST /api/demo/run`:

```bash
# Default: mean over the sample column, real MP-SPDZ backend
curl -sk -X POST https://localhost/api/demo/run \
  -H 'Content-Type: application/json' \
  -d '{"operation":"mean","backend":"mpspdz"}' | jq
```

Request fields:

| Field | Values | Meaning |
|-------|--------|---------|
| `operation` | `sum`, `mean`, `count`, `variance`, `dotProduct` | the aggregate to compute |
| `backend` | `mpspdz` (default), `fhe` | information-theoretic SMPC, or homomorphic encryption |
| `tamper` | `true` / `false` | claim a wrong total to demonstrate proof rejection |
| `values` | number[] | optional input column (defaults to a deterministic sample) |
| `valuesB` | number[] | second vector, for `dotProduct` |

---

## 4. The lifecycle, stage by stage — mapped to the thesis

A real response (operation `mean`, backend `mpspdz`) returns the keys `registration`,
`request`, `aggregation`, `zk`, `settlement`, `audit`. Each maps to a thesis feature:

| # | Stage (API key) | What you see | Thesis correspondence |
|---|-----------------|--------------|------------------------|
| 1 | `registration` | real `txHash`, block number, `dataHash` | On-chain data provenance — `DataRegistry` (Ch4; GDPR purpose limitation) |
| 2 | `request` | `status: "Approved"`, submit + approve tx hashes | Computation request + auditor consent — `ComputingRequest.submitRequest` / `approveRequest` (Ch4 lifecycle) |
| 3 | `aggregation` | `engine: "mp-spdz"`, `result`, 3 nodes with `shareIndex`, `threshold: 2` | **Real SMPC**, Shamir **t = 2 / n = 3** — nodes hold only shares (Ch4; Ch5). The privacy claim: nodes never see cleartext |
| 4 | `zk` | `verified: true`, `gasUsed`, `circuit: "SumCheck(10)"` | **Groth16 ZK bridge** verified on-chain (Ch4 §4.7; Ch5 §5.8) — constant ≈213.7k gas; settlement is gated on it |
| 5 | `settlement` | `breakdown: {provider 7000, nodes 2500, validators 400, treasury 100}` bps | **70 / 25 / 4 / 1** fee split — `FeeManagement` (Ch4) |
| 6 | `audit` | hash-chained records, `verification.valid: true` | Tamper-evident audit trail (Ch5; thesis B4 / QE2.2). Verify any run via `GET /api/demo/audit?sessionId=...` |

Verified live values (sample column `[42,17,99,5,230,81,64,38,120,7]`):
`mean = 70.3`, `sum = 703`, `variance = 4190.81`, Groth16 verify `= 213,732 gas`,
settlement total `= 0.01 ETH` split 70/25/4/1, audit `= 6` chained records.

---

## 5. Demonstrating result integrity (Phase IV)

Flip the **tamper toggle** (or `"tamper": true`) to claim a result the proof does not
support:

```bash
curl -sk -X POST https://localhost/api/demo/run \
  -H 'Content-Type: application/json' \
  -d '{"operation":"mean","backend":"mpspdz","tamper":true}' | jq '{zk,settlement,audit}'
```

Observed: `zk.verified = false` → `settlement.blocked = true`
(*"settlement blocked — aggregation proof did not verify"*) → the audit verifier flags
the exact break point (`broken_at: 2`). This is the thesis's Phase IV guarantee: **a
tampered result cannot be settled, and tampering is detectable.**

---

## 6. Backends and the capability envelope

| Backend | Engine | Supports | Thesis reference |
|---------|--------|----------|------------------|
| `mpspdz` | real MP-SPDZ `shamir-party.x` (Keller, 2020) | `sum`, `mean`, `count`, plus low-multiplicative-depth `variance` & `dotProduct` via Beaver triples | Ch4 / Ch5; §5.8 |
| `fhe` | Microsoft SEAL, BFV scheme, poly-modulus 8192 (single-key) | `sum`, `mean`, `count` | §5.8 comparative benchmark |

```bash
curl -sk -X POST https://localhost/api/demo/run -H 'Content-Type: application/json' \
  -d '{"operation":"sum","backend":"fhe"}' | jq '.aggregation'        # real homomorphic sum

curl -sk -X POST https://localhost/api/demo/run -H 'Content-Type: application/json' \
  -d '{"operation":"variance","backend":"mpspdz"}' | jq '.aggregation' # multiplicative MP-SPDZ
```

Per §5.8, comparison queries (max, quantile) and high-multiplicative-depth models
(logistic regression) are **scoped as future work** — a property of the cryptographic
schemes, stated honestly, not a defect of the prototype.

---

## 7. Thesis ↔ platform feature map

| Thesis concept | Where in the platform | How to show it |
|----------------|-----------------------|----------------|
| Compute-to-data (trade utility, not data) | `aggregation` returns only the result; nodes log shares only | run any op; inspect `docker logs smpc-smpc-node1-1` — no cleartext |
| Shamir SMPC, t = 2 / n = 3 | 3 `smpc-node` containers, `/opt/MP-SPDZ/shamir-party.x` | `aggregation.threshold = 2`, `engine = "mp-spdz"` |
| Zero-knowledge result verification | `circuits/sum.circom` + `Groth16Verifier.sol` | `zk.verified`, `zk.gasUsed`; tamper → rejected |
| Role-aligned incentives (70/25/4/1) | `FeeManagement` contract | `settlement.breakdown` |
| On-chain coordination + consent | `DataRegistry`, `ComputingRequest`, auditor approval | `registration`, `request.status = "Approved"` |
| Tamper-evident accountability | hash-chained audit trail in Redis | `audit.verification`; `GET /api/demo/audit` |
| Homomorphic alternative (compared) | node-seal / Microsoft SEAL BFV | `backend: "fhe"` |

---

## 8. Honest scope (matches thesis §5.8)

The demonstrator is a deliberate **vertical slice**, and the thesis is explicit about it:

- **Single host.** All containers run on one machine; absolute latencies are
  machine-dependent — the portable claim is the *ratio* between backends, not any one number.
- **Co-located nodes.** Real MPC, but not geographically distributed.
- **Local chain.** Transactions run on a local chain (`smpc-chain`), not a funded mainnet;
  economic figures are *projected* (locally-measured gas × cited L2 gas price × cited ETH price), not paid.
- **Single-key FHE.** The FHE path runs genuine SEAL computation; multi-key aggregation is simplified.
- **Relayer model.** The backend signs transactions with the deployer key (acceptable for the slice; not for production).

---

## 9. Verify it yourself

```bash
# 1. health
docker compose -f docker-compose.prod.yml ps

# 2. full lifecycle
curl -sk -X POST https://localhost/api/demo/run -H 'Content-Type: application/json' \
  -d '{"operation":"mean","backend":"mpspdz"}' | jq

# 3. integrity (tamper rejected)
curl -sk -X POST https://localhost/api/demo/run -H 'Content-Type: application/json' \
  -d '{"operation":"mean","tamper":true}' | jq '{zk:.zk.verified, blocked:.settlement.blocked}'

# 4. nodes see only shares
docker logs smpc-smpc-node1-1 --tail 20      # program names + exit codes, no cleartext
```

---

## 10. Project layout (essentials)

- `src/app/` — Next.js App Router; `/demo` page and `/api/*` routes (`api/demo/run`).
- `src/components/demo/SecureComputationTerminal.tsx` — the demo UI.
- `src/lib/execution/smpc-orchestrator.ts` — MP-SPDZ aggregation; `src/lib/contracts/zk.ts` — runtime Groth16.
- `contracts/` — Solidity (`DataRegistry`, `ComputingRequest`, `FeeManagement`, `SMPCProtocol`, `Groth16Verifier`).
- `services/mpspdz-node/` — the SMPC compute node (real `shamir-party.x` + JS fallback).
- `circuits/` — `sum.circom` + Groth16 artifacts.
- `prototype/` — benchmark harness (`benchmarks/`) and result reports (`reports/`).

---

*License: Apache-2.0. This is a research demonstrator for the thesis's Chapter 4 Solution
Plan; see §5.8 for the evaluated scope and limitations.*
