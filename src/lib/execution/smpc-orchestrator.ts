/**
 * SMPC orchestrator (the off-chain coordinator role).
 *
 * Performs a genuine secure aggregation across the independent compute-node
 * containers using additively-homomorphic Shamir secret sharing (t=2, n=3):
 *
 *   1. Split each input value into n shares with a degree-(t-1) polynomial.
 *   2. Send node j ONLY the j-th share of every value (never the raw values).
 *   3. Each node returns the sum of the shares it holds (a share of the total).
 *   4. Reconstruct the true sum from any t partials via Lagrange interpolation.
 *
 * A single node — or any t-1 colluding nodes — learns nothing about the inputs.
 * This is the live demonstration of the thesis privacy claim. ZK/FHE paths
 * remain clearly-labelled simulations elsewhere.
 */

import { spawn } from 'child_process'
import { ShamirSecretSharing } from '@/lib/mkfhe/dkg/shamir'

const PRIME = BigInt('2147483647') // 2^31 - 1, matches ShamirSecretSharing default
const THRESHOLD = 2
const NUM_NODES = 3

// Additive ops reconstruct from local share sums (1 round); multiplicative ops
// (variance, dotProduct) require Beaver triples and a 2-round protocol.
export type SmpcOperation = 'sum' | 'mean' | 'count' | 'variance' | 'dotProduct'

export interface NodeTrace {
  nodeId: string
  endpoint: string
  shareIndex: number
  shareCount: number
  /** The opaque partial (a field element) the node returned — proof it only saw shares. */
  partial: string
  /** Interaction rounds this node performed (1 additive, 2 for Beaver multiplication). */
  rounds?: number
}

export interface SmpcResult {
  operation: SmpcOperation
  result: number
  recordCount: number
  threshold: number
  numNodes: number
  prime: string
  nodes: NodeTrace[]
  durationMs: number
  /** True when real node containers responded; false if it fell back to local simulation. */
  live: boolean
  /** Number of secure multiplications (Beaver triples consumed); set for multiplicative ops. */
  beaverTriples?: number
  /** Which SMPC engine produced this: the real MP-SPDZ framework or the JS Shamir fallback. */
  engine?: 'mp-spdz' | 'js-shamir'
}

function nodeUrls(): string[] {
  const raw = process.env.SMPC_NODE_URLS
  if (raw && raw.trim()) return raw.split(',').map((s) => s.trim()).filter(Boolean)
  return ['http://localhost:9991', 'http://localhost:9992', 'http://localhost:9993']
}

const mod = (v: bigint) => ((v % PRIME) + PRIME) % PRIME

/** Random field element in [0, PRIME). Math.random is sufficient for a demo mask. */
function randField(): bigint {
  return BigInt(Math.floor(Math.random() * Number(PRIME))) % PRIME
}

async function postCompute(url: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${url}/compute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, prime: PRIME.toString() }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`node returned ${res.status}`)
  return res.json()
}

/** Additive secure sum: split each value, each node sums its shares, reconstruct (1 round). */
async function additiveSum(
  values: number[], shamir: ShamirSecretSharing, urls: string[], sessionId: string
): Promise<{ sum: bigint; nodes: NodeTrace[] }> {
  const perNode: bigint[][] = Array.from({ length: urls.length }, () => [])
  for (const v of values) {
    shamir.generateShares(BigInt(Math.round(v)), THRESHOLD, urls.length, sessionId)
      .forEach((sh, idx) => perNode[idx].push(sh.shareValue))
  }
  const resp = await Promise.all(urls.map(async (url, idx) => {
    const json = await postCompute(url, { sessionId, shares: perNode[idx].map((s) => s.toString()) })
    return { idx, url, json }
  }))
  const sum = shamir.reconstructSecret(resp.map(({ idx, json }) => ({
    shareIndex: idx + 1, shareValue: BigInt(json.partial),
    partyId: json.nodeId || `node_${idx + 1}`, threshold: THRESHOLD, sessionId,
  })) as any)
  const nodes: NodeTrace[] = resp.map(({ idx, url, json }) => ({
    nodeId: json.nodeId || String(idx + 1), endpoint: url, shareIndex: idx + 1,
    shareCount: json.shareCount ?? perNode[idx].length, partial: String(json.partial), rounds: 1,
  }))
  return { sum, nodes }
}

/**
 * Secure Σ aₖ·bₖ via Beaver triples. Multiplication can't be done locally on
 * shares, so each product consumes a triple (x,y,z=xy) and runs two rounds:
 *   round 1 opens d=a−x and e=b−y (safe: x,y are random masks);
 *   round 2 each node returns its share of Σ(z + d·b + e·a); we subtract Σ d·e.
 */
async function beaverProducts(
  aVals: number[], bVals: number[], shamir: ShamirSecretSharing, urls: string[], sessionId: string
): Promise<{ product: bigint; triples: number; nodes: NodeTrace[] }> {
  const n = urls.length
  const K = aVals.length
  const aSh: bigint[][] = Array.from({ length: n }, () => [])
  const bSh: bigint[][] = Array.from({ length: n }, () => [])
  const xSh: bigint[][] = Array.from({ length: n }, () => [])
  const ySh: bigint[][] = Array.from({ length: n }, () => [])
  const zSh: bigint[][] = Array.from({ length: n }, () => [])
  const share = (secret: bigint, dst: bigint[][]) =>
    shamir.generateShares(secret, THRESHOLD, n, sessionId).forEach((s, idx) => dst[idx].push(s.shareValue))

  for (let k = 0; k < K; k++) {
    const x = randField(), y = randField()
    share(BigInt(Math.round(aVals[k])), aSh)
    share(BigInt(Math.round(bVals[k])), bSh)
    share(x, xSh)
    share(y, ySh)
    share(mod(x * y), zSh)
  }

  // Round 1 — mask & open d, e.
  const r1 = await Promise.all(urls.map(async (url, idx) => ({
    idx, json: await postCompute(url, {
      mode: 'beaver-open',
      a: aSh[idx].map(String), b: bSh[idx].map(String), x: xSh[idx].map(String), y: ySh[idx].map(String),
    }),
  })))
  const dPub: bigint[] = [], ePub: bigint[] = []
  for (let k = 0; k < K; k++) {
    dPub.push(shamir.reconstructSecret(r1.map(({ idx, json }) => ({
      shareIndex: idx + 1, shareValue: BigInt(json.d[k]), threshold: THRESHOLD, sessionId, partyId: `n${idx + 1}`,
    })) as any))
    ePub.push(shamir.reconstructSecret(r1.map(({ idx, json }) => ({
      shareIndex: idx + 1, shareValue: BigInt(json.e[k]), threshold: THRESHOLD, sessionId, partyId: `n${idx + 1}`,
    })) as any))
  }

  // Round 2 — combine with public d, e.
  const r2 = await Promise.all(urls.map(async (url, idx) => ({
    idx, url, json: await postCompute(url, {
      mode: 'beaver-combine',
      a: aSh[idx].map(String), b: bSh[idx].map(String), z: zSh[idx].map(String),
      d: dPub.map(String), e: ePub.map(String),
    }),
  })))
  const S = shamir.reconstructSecret(r2.map(({ idx, json }) => ({
    shareIndex: idx + 1, shareValue: BigInt(json.partial), threshold: THRESHOLD, sessionId, partyId: json.nodeId || `n${idx + 1}`,
  })) as any)
  let dotDE = BigInt(0)
  for (let k = 0; k < K; k++) dotDE = mod(dotDE + dPub[k] * ePub[k])
  const product = mod(S - dotDE)
  const nodes: NodeTrace[] = r2.map(({ idx, url, json }) => ({
    nodeId: json.nodeId || String(idx + 1), endpoint: url, shareIndex: idx + 1,
    shareCount: K, partial: String(json.partial), rounds: 2,
  }))
  return { product, triples: K, nodes }
}

/**
 * Run a secure aggregation over `values`. Throws only if it cannot produce a
 * correct result; callers should catch and fall back to a labelled simulation.
 */
export async function runSecureAggregation(
  values: number[],
  operation: SmpcOperation = 'sum',
  opts: { sessionId?: string; valuesB?: number[] } = {}
): Promise<SmpcResult> {
  const start = Date.now()
  const sessionId = opts.sessionId || `sess_${start}`
  const urls = nodeUrls().slice(0, NUM_NODES)
  const recordCount = values.length

  // count is public metadata — no secret sharing needed.
  if (operation === 'count') {
    return {
      operation, result: recordCount, recordCount, threshold: THRESHOLD,
      numNodes: urls.length, prime: PRIME.toString(), nodes: [],
      durationMs: Date.now() - start, live: true,
    }
  }

  const shamir = new ShamirSecretSharing({ prime: PRIME })

  // Multiplicative ops: Beaver-triple protocol (2 rounds across the nodes).
  if (operation === 'variance') {
    const [{ sum }, sq] = await Promise.all([
      additiveSum(values, shamir, urls, sessionId),
      beaverProducts(values, values, shamir, urls, sessionId),
    ])
    const n = recordCount
    const mean = n > 0 ? Number(sum) / n : 0
    const variance = n > 0 ? Number(sq.product) / n - mean * mean : 0
    return {
      operation, result: variance, recordCount, threshold: THRESHOLD, numNodes: urls.length,
      prime: PRIME.toString(), nodes: sq.nodes, durationMs: Date.now() - start, live: true,
      beaverTriples: sq.triples,
    }
  }
  if (operation === 'dotProduct') {
    const bVals = opts.valuesB && opts.valuesB.length === values.length ? opts.valuesB : values
    const { product, triples, nodes } = await beaverProducts(values, bVals, shamir, urls, sessionId)
    return {
      operation, result: Number(product), recordCount, threshold: THRESHOLD, numNodes: urls.length,
      prime: PRIME.toString(), nodes, durationMs: Date.now() - start, live: true, beaverTriples: triples,
    }
  }

  // shares[nodeIndex] = list of share values destined for that node.
  const perNodeShares: bigint[][] = Array.from({ length: urls.length }, () => [])
  for (const v of values) {
    const secret = BigInt(Math.round(v))
    const shares = shamir.generateShares(secret, THRESHOLD, urls.length, sessionId)
    shares.forEach((sh, idx) => perNodeShares[idx].push(sh.shareValue))
  }

  // Fan the shares out to the nodes; each returns the sum of its held shares.
  const responses = await Promise.all(
    urls.map(async (url, idx) => {
      const res = await fetch(`${url}/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          prime: PRIME.toString(),
          shares: perNodeShares[idx].map((s) => s.toString()),
        }),
        // Keep the demo snappy; nodes do trivial arithmetic.
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) throw new Error(`node ${idx + 1} returned ${res.status}`)
      const json = await res.json()
      return { idx, url, json }
    })
  )

  // Reconstruct the sum from the partials (shares of the total at x = node index).
  const partialShares = responses.map(({ idx, json }) => ({
    shareIndex: idx + 1,
    shareValue: BigInt(json.partial),
    partyId: json.nodeId || `node_${idx + 1}`,
    threshold: THRESHOLD,
    sessionId,
  }))
  const sum = shamir.reconstructSecret(partialShares as any)
  const sumNum = Number(sum)

  const result = operation === 'mean'
    ? (recordCount > 0 ? sumNum / recordCount : 0)
    : sumNum

  const nodes: NodeTrace[] = responses.map(({ idx, url, json }) => ({
    nodeId: json.nodeId || String(idx + 1),
    endpoint: url,
    shareIndex: idx + 1,
    shareCount: json.shareCount ?? perNodeShares[idx].length,
    partial: String(json.partial),
  }))

  return {
    operation,
    result,
    recordCount,
    threshold: THRESHOLD,
    numNodes: urls.length,
    prime: PRIME.toString(),
    nodes,
    durationMs: Date.now() - start,
    live: true,
  }
}

// ---- Real MP-SPDZ engine (shamir-party.x + external-client I/O) ----

// Map each op to its precompiled MP-SPDZ program. mean reuses the sum program
// (the public /n division happens client-side); variance/dotProduct multiply.
const MPSPDZ_PROGRAMS: Partial<Record<SmpcOperation, string>> = {
  sum: 'agg_sum', mean: 'agg_sum', variance: 'agg_variance', dotProduct: 'agg_dotproduct',
}
// Number of revealed outputs each program returns to the client.
const MPSPDZ_OUTPUTS: Partial<Record<SmpcOperation, number>> = { variance: 2 }

/** Drive the bundled MP-SPDZ external client: secret-shares inputs to the parties
 *  and reads the revealed result(s). Returns the parsed `{results: number[]}`. */
function runMpSpdzClient(values: number[], valuesB: number[] | undefined, nOut: number): Promise<{ results: number[] }> {
  const clientDir = process.env.MPSPDZ_CLIENT_DIR || '/opt/mpspdz-client'
  const script = process.env.MPSPDZ_CLIENT_SCRIPT || `${clientDir}/mpspdz-client.py`
  const hosts = process.env.MPSPDZ_NODE_HOSTS || 'smpc-node1,smpc-node2,smpc-node3'
  const portBase = process.env.MPSPDZ_CLIENT_PORT_BASE || '14000'
  const args = [
    script, hosts, portBase, '0',
    values.map((v) => String(Math.round(v))).join(','),
    valuesB && valuesB.length ? valuesB.map((v) => String(Math.round(v))).join(',') : '',
    String(nOut),
  ]

  return new Promise((resolve, reject) => {
    const p = spawn('python3', args, {
      cwd: clientDir,
      env: { ...process.env, MPSPDZ_HOME: process.env.MPSPDZ_HOME || '/opt/MP-SPDZ' },
    })
    let out = '', err = ''
    p.stdout.on('data', (d) => { out += d })
    p.stderr.on('data', (d) => { err += d })
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('mpspdz client timeout')) }, 30000)
    p.on('error', (e) => { clearTimeout(timer); reject(e) })
    p.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) return reject(new Error(`mpspdz client exit ${code}: ${err.slice(-300)}`))
      try {
        const last = out.trim().split('\n').filter(Boolean).pop() || '{}'
        resolve(JSON.parse(last))
      } catch {
        reject(new Error(`unparseable client output: ${out.slice(-200)}`))
      }
    })
  })
}

/**
 * Run an aggregation on the REAL MP-SPDZ framework: launch a shamir-party.x party
 * in each node container, then act as the external client that secret-shares the
 * inputs to all parties (no party sees cleartext) and reads the revealed result.
 * Throws if MP-SPDZ is unavailable so the caller can fall back to the JS engine.
 */
export async function runMpSpdzAggregation(
  values: number[], operation: SmpcOperation = 'sum', opts: { valuesB?: number[] } = {}
): Promise<SmpcResult> {
  const start = Date.now()
  const program = MPSPDZ_PROGRAMS[operation]
  if (!program) throw new Error(`MP-SPDZ program not available for '${operation}'`)
  const apis = nodeUrls().slice(0, NUM_NODES)

  // 1. Launch the party in each node container.
  await Promise.all(apis.map(async (u) => {
    const r = await fetch(`${u}/mpc-run`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ program }), signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) throw new Error(`mpc-run ${u} -> ${r.status}`)
  }))
  // 2. Let the parties complete inter-party setup (the client also retries).
  await new Promise((r) => setTimeout(r, 1500))
  // 3. External client: secret-share inputs, read the revealed result(s).
  const nOut = MPSPDZ_OUTPUTS[operation] ?? 1
  const { results } = await runMpSpdzClient(values, opts.valuesB, nOut)

  const recordCount = values.length
  let value: number
  if (operation === 'mean') {
    value = recordCount > 0 ? results[0] / recordCount : 0
  } else if (operation === 'variance') {
    const mean = recordCount > 0 ? results[0] / recordCount : 0
    value = recordCount > 0 ? results[1] / recordCount - mean * mean : 0
  } else {
    value = results[0] // sum, dotProduct
  }
  const multiplicative = operation === 'variance' || operation === 'dotProduct'
  const nodes: NodeTrace[] = apis.map((u, i) => ({
    nodeId: String(i + 1), endpoint: u, shareIndex: i + 1, shareCount: recordCount,
    partial: 'secret-shared (client I/O)', rounds: multiplicative ? 3 : 2,
  }))
  return {
    operation, result: value, recordCount, threshold: THRESHOLD, numNodes: NUM_NODES,
    prime: 'MP-SPDZ GF(p), 128-bit', nodes, durationMs: Date.now() - start, live: true, engine: 'mp-spdz',
  }
}

/**
 * Deterministic local fallback that mirrors the same math without the node
 * round-trip. Used when the node containers are unreachable so the demo never
 * breaks; flagged `live: false` so the UI can label it honestly.
 */
export function simulateAggregation(
  values: number[], operation: SmpcOperation = 'sum', valuesB?: number[]
): SmpcResult {
  const recordCount = values.length
  const sum = values.reduce((a, b) => a + Math.round(b), 0)
  const mean = recordCount ? sum / recordCount : 0
  let result: number
  let beaverTriples: number | undefined
  switch (operation) {
    case 'count': result = recordCount; break
    case 'mean': result = mean; break
    case 'variance':
      result = recordCount ? values.reduce((a, b) => a + Math.round(b) ** 2, 0) / recordCount - mean * mean : 0
      beaverTriples = recordCount
      break
    case 'dotProduct': {
      const b = valuesB && valuesB.length === values.length ? valuesB : values
      result = values.reduce((acc, v, i) => acc + Math.round(v) * Math.round(b[i]), 0)
      beaverTriples = recordCount
      break
    }
    default: result = sum
  }
  return {
    operation, result, recordCount, threshold: THRESHOLD, numNodes: NUM_NODES,
    prime: PRIME.toString(), nodes: [], durationMs: 0, live: false, beaverTriples,
  }
}
