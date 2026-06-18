# Remaining Production-Real Rework — Ready-to-Implement Roadmap

> The thesis-critical scope (B1 benchmark, B4 audit) and the feasible production-real
> items (B-REQ on-chain request/approval, B-FHE real homomorphic path, B0 L2 deploy
> config) are **done**. The two items below need heavy toolchains (Rust/circom, a
> ~30-min MP-SPDZ C++ build) and are documented here with exact steps + integration
> points so they can be implemented when that toolchain is provisioned. Both are also
> written into thesis Future Work (§8.7).

---

## B-ZK — Live Groth16 verifiable computation (QE2.2)

**Current state.** The ZK path in `src/lib/execution/algorithm-executor.ts`
(`executeZKComputation` → `compileToArithmeticCircuit` / `generateZKProof` /
`verifyZKProof`) is a labelled simulation. `SMPCProtocol.sol` already carries a
`bytes32 zkProof` field and `submitResults(..., zkProof)`, so the on-chain hook exists.

**Toolchain.** circom 2 (Rust) + snarkjs (npm) — no special hardware.
```bash
cargo install circom            # or download a circom 2.x release binary
npm install snarkjs circomlib
```

**Steps.**
1. Author a circuit `circuits/aggregate.circom` that proves the published result is the
   correct function of the committed private inputs (e.g. result == Σ inputs, with a
   Pedersen/Poseidon commitment to the input vector as a public signal).
2. Compile: `circom circuits/aggregate.circom --r1cs --wasm --sym -o build/`.
3. Groth16 trusted setup: fetch a Powers-of-Tau file (e.g. `powersOfTau28_hez_final_14.ptau`),
   then `snarkjs groth16 setup`, `snarkjs zkey contribute`, `snarkjs zkey export verificationkey`.
4. Generate the on-chain verifier: `snarkjs zkey export solidityverifier build/aggregate.zkey contracts/Groth16Verifier.sol`
   (constant ≈200–280k gas — matches the QE2.2 claim once measured).
5. Deploy `Groth16Verifier` in `scripts/deploy.cjs`; have `SMPCProtocol.submitResults`
   (or a thin wrapper) call `verifier.verifyProof(a, b, c, publicSignals)` before settlement.
6. Replace the executor's mock `generateZKProof`/`verifyZKProof` with
   `snarkjs.groth16.fullProve` / `groth16.verify` over the compiled wasm+zkey; relabel the
   `zk` path as live (mirror what was done for `fhe`).

**Effort:** ~1–2 weeks (circuit design + setup ceremony are the long poles).
**Verifies:** QE2.2 result-verification claim with a measured on-chain gas figure.

---

## B-MPC — Real MP-SPDZ compute path (QE2.1 / extends QE4.2)

**Current state.** The compute nodes (`services/mpspdz-node/`) are stateless Shamir
share-summers (real additive secret sharing, but linear aggregates only). A real MP-SPDZ
program already sits beside them: `services/mpspdz-node/programs/healthcare_stats.mpc`,
and `services/smpc-coordinator/` is a fuller coordinator off the live path. Replacing the
summers with an MP-SPDZ runtime enables secure comparison/order statistics
(max/quantile) and malicious-secure protocol options.

**Toolchain.** MP-SPDZ (C++), a heavy native build — use Docker to avoid host churn.
```bash
git clone https://github.com/data61/MP-SPDZ && cd MP-SPDZ
make -j setup && make -j shamir-party.x     # Shamir (matches the thesis t-of-n model)
./compile.py healthcare_stats               # compile the .mpc program to bytecode
```

**Steps.**
1. Containerise `shamir-party.x` per compute node (extend `services/mpspdz-node/Dockerfile`).
2. Distribute the compiled program + each party's input share via `smpc-coordinator`;
   run the 3 parties; collect the opened result.
3. Replace the HTTP share-summing in `src/lib/execution/smpc-orchestrator.ts` with the
   MP-SPDZ party orchestration (keep the current path as a fallback).
4. Extend the benchmark `our-protocol` backend
   (`prototype/benchmarks/src/backends/our-protocol.ts`) to call the MP-SPDZ pipeline for
   `max`/`quantile` — closing the coverage gap currently marked "unsupported".

**Effort:** ~2–3 weeks (native build + multi-party orchestration; Docker strongly advised).
**Verifies:** QE2.1 security-model fidelity and extends the QE4.2 benchmark beyond linear aggregates.

---

## Also remaining (smaller, already noted)

- **TEE benchmark backend** — Gramine + Intel SGX, or Azure Confidential Computing if no
  SGX hardware (decided: documented as future work). Slot into
  `prototype/benchmarks/src/backends/` as the 4th backend.
- **Measured L2 gas** — `arbitrumSepolia` network is wired in `hardhat.config.cjs`; provide
  `ARBITRUM_SEPOLIA_RPC_URL` + a funded `DEPLOYER_PRIVATE_KEY` and run the deploy to replace
  projected gas with measured.
- **Multi-key FHE** — `mkfhe/engine.ts aggregatePublicKeys` is simplified (uses the first
  party's key); true MKFHE key combination is the deeper extension of the now-real FHE path.
- **Production key custody** — per-party signing keys / HSM for the audit attestations
  (removes the relayer-trust caveat).
