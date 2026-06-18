/**
 * Live Groth16 layer for the demo's Phase IV.
 *
 * Generates a REAL zk-SNARK proof at runtime (snarkjs over the committed
 * SumCheck(10) circuit) that the actual registered inputs sum to the computed
 * total, then verifies it on the deployed on-chain Groth16Verifier. The proof is
 * bound to each run's data — not precomputed. The `tampered` path submits a wrong
 * public total, which the verifier rejects, demonstrating that a tampered result
 * cannot be settled.
 */
import path from 'path'
// snarkjs ships no type declarations
// @ts-ignore
import * as snarkjs from 'snarkjs'
import { verifyProofOnChain } from './onchain'

const ART = path.join(process.cwd(), 'circuits', 'artifacts')
const WASM = path.join(ART, 'sum.wasm')
const ZKEY = path.join(ART, 'sum_final.zkey')
const CIRCUIT_N = 10 // SumCheck(10): fixed number of private addends

export interface ZkResult {
  live: boolean
  verified: boolean
  tampered: boolean
  gasUsed?: string
  circuit: string
  provenTotal: string
  claimedTotal: string
  proof?: { a: string[]; b: string[][]; c: string[] }
  note: string
  error?: string
}

export async function verifyAggregationProof(values: number[], tampered = false): Promise<ZkResult> {
  const circuit = 'SumCheck(10)'
  // The circuit has a fixed 10 inputs; zero-pad (sum-preserving) or truncate.
  const inputs = values.slice(0, CIRCUIT_N).map((v) => Math.round(v))
  while (inputs.length < CIRCUIT_N) inputs.push(0)
  const provenTotal = inputs.reduce((a, b) => a + b, 0)
  const claimedTotal = tampered ? provenTotal + 1 : provenTotal
  const note = tampered
    ? `Tampered claimed total (${claimedTotal}) ≠ proven input sum (${provenTotal}); the on-chain verifier rejects it, so settlement is blocked.`
    : `Live Groth16 proof that the ${CIRCUIT_N} registered inputs sum to ${provenTotal}, generated this run and verified on-chain (attests input integrity; the displayed result derives from these inputs).`
  const base = { tampered, circuit, provenTotal: String(provenTotal), claimedTotal: String(claimedTotal), note }

  try {
    const { proof } = await snarkjs.groth16.fullProve(
      { in: inputs.map(String), total: String(provenTotal) }, WASM, ZKEY
    )
    // Format calldata; the tampered run substitutes a wrong public total.
    const calldata: string = await snarkjs.groth16.exportSolidityCallData(proof, [String(claimedTotal)])
    const [a, b, c] = JSON.parse('[' + calldata + ']')

    const res = await verifyProofOnChain(calldata)
    if (res.error === 'onchain disabled') {
      // Degrade like the other steps: the proof is real, only the on-chain check is mocked.
      return { ...base, live: false, verified: !tampered, proof: { a, b, c }, note: `${note} (on-chain verify simulated — chain disabled)` }
    }
    return { ...base, live: res.error === undefined, verified: res.verified, gasUsed: res.gasUsed, proof: { a, b, c }, error: res.error }
  } catch (err) {
    return { ...base, live: false, verified: false, error: err instanceof Error ? err.message : 'zk proof failed' }
  }
}
