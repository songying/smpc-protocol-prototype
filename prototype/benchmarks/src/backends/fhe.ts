/**
 * FHE backend — real homomorphic aggregation via Microsoft SEAL (node-seal).
 *
 * Uses the BFV scheme for EXACT integer aggregation: values are batch-encoded
 * (SIMD slots), encrypted, summed homomorphically across ciphertexts, then
 * decrypted and the slots summed. This is a genuine fully-homomorphic
 * computation — the server never sees plaintext values — and gives real FHE
 * latency for the comparison (QE4.2). node-seal (SEAL WASM) is used in place of
 * OpenFHE so it runs without a native C++ toolchain; the Test Report records
 * the substitution and the exact parameters.
 *
 * BFV does linear aggregation cheaply, so this backend `supports` sum and mean.
 * Max/quantile (comparisons) and logistic regression (deep multiplicative depth
 * needing CKKS + bootstrapping) are reported unsupported rather than faked.
 */

import type { Backend, QuerySpec, Dataset, QueryValue } from '../types'

const POLY_MODULUS_DEGREE = 8192
const COEFF_BITS = [60, 40, 40, 60]
const PLAIN_MODULUS_BITS = 20 // ~2^20 plain modulus; slot sums stay well below it

let ctxPromise: Promise<any> | null = null

async function getContext(): Promise<any> {
  if (ctxPromise) return ctxPromise
  ctxPromise = (async () => {
    const mod: any = await import('node-seal')
    const SEAL = mod.default || mod
    const seal = await SEAL()

    const parms = seal.EncryptionParameters(seal.SchemeType.bfv)
    parms.setPolyModulusDegree(POLY_MODULUS_DEGREE)
    parms.setCoeffModulus(seal.CoeffModulus.Create(POLY_MODULUS_DEGREE, Int32Array.from(COEFF_BITS)))
    parms.setPlainModulus(seal.PlainModulus.Batching(POLY_MODULUS_DEGREE, PLAIN_MODULUS_BITS))

    const context = seal.Context(parms, true, seal.SecurityLevel.tc128)
    if (!context.parametersSet()) throw new Error('node-seal: encryption parameters not valid')

    const keyGenerator = seal.KeyGenerator(context)
    const secretKey = keyGenerator.secretKey()
    const publicKey = keyGenerator.createPublicKey()
    const encryptor = seal.Encryptor(context, publicKey)
    const decryptor = seal.Decryptor(context, secretKey)
    const evaluator = seal.Evaluator(context)
    const encoder = seal.BatchEncoder(context)

    return { seal, encryptor, decryptor, evaluator, encoder, slotCount: encoder.slotCount }
  })()
  return ctxPromise
}

export const fheBackend: Backend = {
  name: 'fhe',
  trustAssumption: 'computational',
  async available() {
    try {
      await getContext()
      return true
    } catch {
      return false
    }
  },
  supports(query: QuerySpec) {
    return query.name === 'sum' || query.name === 'mean'
  },
  async run(query: QuerySpec, data: Dataset): Promise<QueryValue> {
    const { encryptor, decryptor, evaluator, encoder, slotCount } = await getContext()

    // Encrypt the data in SIMD-batched chunks and add the ciphertexts.
    let acc: any = null
    for (let off = 0; off < data.values.length; off += slotCount) {
      const end = Math.min(off + slotCount, data.values.length)
      const chunk = new Int32Array(slotCount)
      for (let i = off; i < end; i++) chunk[i - off] = Math.round(data.values[i])
      const plain = encoder.encode(chunk)
      const cipher = encryptor.encrypt(plain)
      plain.delete()
      if (acc === null) {
        acc = cipher
      } else {
        evaluator.add(acc, cipher, acc) // homomorphic, slot-wise
        cipher.delete()
      }
    }
    if (acc === null) return 0

    const resultPlain = decryptor.decrypt(acc)
    const slots = encoder.decode(resultPlain) as Int32Array
    acc.delete()
    resultPlain.delete()

    let total = 0
    for (let i = 0; i < slots.length; i++) total += slots[i]
    return query.name === 'mean' ? (data.size > 0 ? total / data.size : 0) : total
  },
}
