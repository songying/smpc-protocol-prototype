/**
 * Real single-key homomorphic aggregation over Microsoft SEAL (node-seal, BFV).
 *
 * The alternative compute backend to MP-SPDZ: values are encrypted, summed
 * homomorphically (the server adds ciphertexts without ever decrypting the
 * inputs), and only the aggregate is decrypted. This is the thesis's
 * "computational" privacy path, contrasting MP-SPDZ's information-theoretic one.
 *
 * Self-contained on purpose: it uses a verified BFVDefault coeff-modulus +
 * BatchEncoder recipe rather than the party-oriented MKFHEEngine (whose configured
 * coefficient moduli exceed the security bit-budget for real SEAL). Supports the
 * additive ops (sum, mean, count); variance/dotProduct stay on the MP-SPDZ path.
 */
import SEAL from 'node-seal'

export type FheOperation = 'sum' | 'mean' | 'count'

export interface FheResult {
  backend: 'fhe'
  operation: FheOperation
  result: number
  recordCount: number
  scheme: 'BFV'
  polyModulusDegree: number
  /** Remaining SEAL invariant noise budget (bits) — headroom before decryption fails. */
  noiseBudget?: number
  durationMs: number
  live: boolean
}

const POLY = 8192

let sealPromise: Promise<any> | null = null
function getSeal(): Promise<any> {
  if (!sealPromise) sealPromise = SEAL()
  return sealPromise
}

export async function runFheAggregation(
  values: number[],
  operation: FheOperation = 'sum'
): Promise<FheResult> {
  const start = Date.now()
  const n = values.length
  const base = { backend: 'fhe' as const, operation, recordCount: n, scheme: 'BFV' as const, polyModulusDegree: POLY }

  // count is public metadata — no encryption required.
  if (operation === 'count') {
    return { ...base, result: n, durationMs: Date.now() - start, live: true }
  }

  const seal = await getSeal()
  const parms = seal.EncryptionParameters(seal.SchemeType.bfv)
  parms.setPolyModulusDegree(POLY)
  parms.setCoeffModulus(seal.CoeffModulus.BFVDefault(POLY))
  parms.setPlainModulus(seal.PlainModulus.Batching(POLY, 20))
  const context = seal.Context(parms, true, seal.SecurityLevel.tc128)
  if (!context.parametersSet()) throw new Error('SEAL parameters not valid')

  const keyGen = seal.KeyGenerator(context)
  const publicKey = keyGen.createPublicKey()
  const secretKey = keyGen.secretKey()
  const encryptor = seal.Encryptor(context, publicKey)
  const decryptor = seal.Decryptor(context, secretKey)
  const evaluator = seal.Evaluator(context)
  const encoder = seal.BatchEncoder(context)

  // Encrypt each value, then add ciphertexts homomorphically (inputs never decrypted).
  let acc: any = null
  for (const v of values) {
    const pt = seal.PlainText()
    encoder.encode(Int32Array.from([Math.round(v)]), pt)
    const ct = seal.CipherText()
    encryptor.encrypt(pt, ct)
    if (!acc) acc = ct
    else evaluator.add(acc, ct, acc)
  }

  const out = seal.PlainText()
  decryptor.decrypt(acc, out)
  const sum = Number(encoder.decode(out)[0])
  const noiseBudget = decryptor.invariantNoiseBudget(acc)
  const result = operation === 'mean' ? (n > 0 ? sum / n : 0) : sum

  return { ...base, result, noiseBudget, durationMs: Date.now() - start, live: true }
}
