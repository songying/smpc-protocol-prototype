/**
 * SMPC compute node.
 *
 * This container represents one independent, non-colluding computing party.
 * It receives ONLY Shamir secret shares — never raw input values — and returns
 * the sum of the shares it holds (its evaluation of the additively-homomorphic
 * sum polynomial at this node's x-coordinate). The coordinator reconstructs the
 * true aggregate from >= t such partials via Lagrange interpolation.
 *
 * Because shares are uniformly random field elements, a single node (or any
 * t-1 colluding nodes) learns nothing about the underlying data — this is the
 * core privacy property the prototype demonstrates live.
 */

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.NODE_PORT || 9999;
const NODE_ID = process.env.NODE_ID || '1';

// Real MP-SPDZ party config (this container acts as one shamir-party.x party).
const MPSPDZ_HOME = process.env.MPSPDZ_HOME || '/opt/MP-SPDZ';
const NODE_INDEX = process.env.NODE_INDEX !== undefined
  ? parseInt(process.env.NODE_INDEX, 10)
  : parseInt(NODE_ID, 10) - 1;
const N_PARTIES = parseInt(process.env.MPSPDZ_N || '3', 10);
const PARTY0_HOST = process.env.MPSPDZ_PARTY0_HOST || 'smpc-node1';
const INTERPARTY_PORT = process.env.MPSPDZ_PORT || '5000';
let currentParty = null;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Liveness / readiness probe.
app.get('/status', (req, res) => {
  res.json({ status: 'healthy', nodeId: NODE_ID, timestamp: new Date().toISOString() });
});

const mod = (v, p) => ((v % p) + p) % p;

/**
 * Compute this node's partial result over the shares it was given. The node sees
 * only opaque field elements; it never recovers any raw value. Three modes:
 *
 *  - mode 'sum' (default): additively-homomorphic aggregation.
 *      Body: { sessionId, prime, shares: ["<dec>", ...] }
 *      Returns: { partial = Σ shares mod p }
 *
 *  Multiplicative ops use Beaver triples (a·b = z + d·b + e·a − d·e), which need
 *  two rounds because a product cannot be computed locally on shares:
 *
 *  - mode 'beaver-open': mask the operands. Body holds this node's shares of the
 *      operands (a, b) and the triple (x, y). Returns this node's shares of the
 *      maskings d = a−x and e = b−y, which the coordinator opens (safe: x,y random).
 *      Body: { prime, a:[..], b:[..], x:[..], y:[..] }  Returns: { d:[..], e:[..] }
 *
 *  - mode 'beaver-combine': with the opened public d,e, each node computes its
 *      share of Σ (z + d·b + e·a); the coordinator subtracts Σ d·e after reconstruction.
 *      Body: { prime, a:[..], b:[..], z:[..], d:[public..], e:[public..] }
 *      Returns: { partial }
 */
app.post('/compute', (req, res) => {
  try {
    const { sessionId, prime, shares, mode = 'sum' } = req.body || {};
    if (!prime) return res.status(400).json({ error: 'prime is required' });
    const p = BigInt(prime);

    if (mode === 'beaver-open') {
      const { a, b, x, y } = req.body;
      if (![a, b, x, y].every(Array.isArray)) {
        return res.status(400).json({ error: 'a,b,x,y share arrays are required' });
      }
      const d = a.map((ai, k) => mod(BigInt(ai) - BigInt(x[k]), p).toString());
      const e = b.map((bi, k) => mod(BigInt(bi) - BigInt(y[k]), p).toString());
      console.log(`[node ${NODE_ID}] beaver-open over ${a.length} products (masked d,e returned)`);
      return res.json({ nodeId: NODE_ID, mode, count: a.length, d, e });
    }

    if (mode === 'beaver-combine') {
      const { a, b, z, d, e } = req.body;
      if (![a, b, z, d, e].every(Array.isArray)) {
        return res.status(400).json({ error: 'a,b,z share arrays and public d,e are required' });
      }
      let partial = 0n;
      for (let k = 0; k < a.length; k++) {
        const term = mod(
          BigInt(z[k]) + BigInt(d[k]) * BigInt(b[k]) + BigInt(e[k]) * BigInt(a[k]),
          p
        );
        partial = mod(partial + term, p);
      }
      console.log(`[node ${NODE_ID}] beaver-combine over ${a.length} products -> partial`);
      return res.json({ nodeId: NODE_ID, mode, shareCount: a.length, partial: partial.toString() });
    }

    // default: additive aggregation
    if (!Array.isArray(shares)) {
      return res.status(400).json({ error: 'shares[] and prime are required' });
    }
    let partial = 0n;
    for (const s of shares) partial = mod(partial + BigInt(s), p);
    console.log(
      `[node ${NODE_ID}] session=${sessionId || '-'} summed ${shares.length} shares ` +
      `(raw values never seen) -> partial computed`
    );
    res.json({
      nodeId: NODE_ID,
      sessionId: sessionId || null,
      shareCount: shares.length,
      partial: partial.toString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Launch this node's real MP-SPDZ party (shamir-party.x) for a program. The
 * party performs inter-party setup (parties find each other via party 0) and
 * then the compiled program listens for the external client on 14000+index.
 * Detached; returns once spawned (the client retries until parties listen).
 * Body: { program } (default 'agg_sum'). The JS /compute path remains the fallback.
 */
app.post('/mpc-run', (req, res) => {
  const program = (req.body && req.body.program) || 'agg_sum';
  if (!/^[a-z0-9_]+$/.test(program)) {
    return res.status(400).json({ error: 'invalid program name' });
  }
  // Free ports from any lingering party of a previous run.
  try { if (currentParty && !currentParty.killed) currentParty.kill('SIGKILL'); } catch (e) { /* ignore */ }

  const args = [program, '-p', String(NODE_INDEX), '-N', String(N_PARTIES), '-h', PARTY0_HOST, '-pn', String(INTERPARTY_PORT)];
  const child = spawn(`${MPSPDZ_HOME}/shamir-party.x`, args, {
    cwd: MPSPDZ_HOME,
    env: { ...process.env, LD_LIBRARY_PATH: `${MPSPDZ_HOME}:${MPSPDZ_HOME}/local/lib` },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  currentParty = child;
  let tail = '';
  const cap = (d) => { tail = (tail + d).slice(-2000); };
  child.stdout.on('data', cap);
  child.stderr.on('data', cap);
  child.on('error', (e) => console.error(`[node ${NODE_ID}] party spawn error: ${e.message}`));
  child.on('exit', (code) => console.log(`[node ${NODE_ID}] party ${program} exit=${code}`));
  // Safety net: never let a party outlive a run (e.g. client never connects).
  const killer = setTimeout(() => { try { child.kill('SIGKILL'); } catch (e) {} }, 60000);
  child.on('exit', () => clearTimeout(killer));
  child.unref();

  setTimeout(() => res.json({
    nodeId: NODE_ID, partyIndex: NODE_INDEX, program, nParties: N_PARTIES, status: 'launched',
  }), 300);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SMPC compute node ${NODE_ID} listening on port ${PORT}`);
});
