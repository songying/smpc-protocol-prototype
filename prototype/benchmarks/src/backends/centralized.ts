/**
 * Centralized plaintext backend — the latency LOWER BOUND (no privacy at all).
 *
 * A single in-memory node computing on raw values. It is the reference point
 * the privacy-preserving backends are measured against: it shows the cost a
 * user would pay if they simply trusted one party with the cleartext.
 */

import type { Backend, QuerySpec, Dataset, QueryValue } from '../types'
import { referenceResult } from '../workload'

export const centralizedBackend: Backend = {
  name: 'centralized',
  trustAssumption: 'none (plaintext)',
  async available() {
    return true
  },
  async run(query: QuerySpec, data: Dataset): Promise<QueryValue> {
    return referenceResult(query, data)
  },
}
