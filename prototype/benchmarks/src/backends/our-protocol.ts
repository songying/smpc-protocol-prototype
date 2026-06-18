/**
 * Our-protocol backend — the thesis's Shamir secure-aggregation, measured.
 *
 * Reuses the SAME ShamirSecretSharing implementation the live orchestrator uses
 * (src/lib/mkfhe/dkg/shamir). Each value is split into n=3 shares with a
 * degree-(t-1) polynomial (t=2); the additive homomorphism of Shamir lets each
 * "node" sum its held shares, and the true total is reconstructed from any t
 * partials. This measures the real cryptographic cost of the protocol's secure
 * aggregation in-process; network and on-chain (L2) overheads are measured
 * separately (B0) and added in the Test Report — they are not folded in here.
 *
 * Additive secret sharing natively supports linear aggregates only, so this
 * backend `supports` sum and mean; max / quantile / logistic-regression require
 * comparison/garbled-circuit machinery (MP-SPDZ, item B-MPC) and are reported
 * as unsupported rather than faked.
 */

import type { Backend, QuerySpec, Dataset, QueryValue } from '../types'
import { ShamirSecretSharing } from '../../../../src/lib/mkfhe/dkg/shamir'

const PRIME = BigInt('2147483647') // 2^31 - 1, matches the orchestrator
const THRESHOLD = 2
const NUM_NODES = 3

export const ourProtocolBackend: Backend = {
  name: 'our-protocol',
  trustAssumption: 'information-theoretic',
  async available() {
    return true
  },
  supports(query: QuerySpec) {
    return query.name === 'sum' || query.name === 'mean'
  },
  async run(query: QuerySpec, data: Dataset): Promise<QueryValue> {
    const shamir = new ShamirSecretSharing({ prime: PRIME })
    const sessionId = `bench_${data.size}`
    const perNode: bigint[] = Array.from({ length: NUM_NODES }, () => BigInt(0))

    // Split each value and accumulate, per node, the share it would hold.
    for (let i = 0; i < data.values.length; i++) {
      const secret = BigInt(Math.round(data.values[i]))
      const shares = shamir.generateShares(secret, THRESHOLD, NUM_NODES, sessionId)
      for (let j = 0; j < NUM_NODES; j++) perNode[j] += shares[j].shareValue
    }

    // Each per-node sum is a share (at x = node index) of the grand total.
    const partials = perNode.map((val, idx) => ({
      shareIndex: idx + 1,
      shareValue: val,
      threshold: THRESHOLD,
      sessionId,
      partyId: `n${idx + 1}`,
    }))
    const sum = Number(shamir.reconstructSecret(partials.slice(0, THRESHOLD) as any))

    return query.name === 'mean' ? (data.size > 0 ? sum / data.size : 0) : sum
  },
}
