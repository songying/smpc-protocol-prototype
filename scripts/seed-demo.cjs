/**
 * Seed demo data so a visitor can walk the full trade lifecycle immediately.
 *
 * - Writes a few approved datasets into Redis in the shape /api/data expects
 *   (consumers only see status === 'approved').
 * - Registers each dataset on-chain (DataRegistry) so it carries a real tx hash.
 * - Writes one approved aggregation algorithm.
 *
 * Idempotent: fixed ids, safe to run on every boot. Degrades gracefully if the
 * chain isn't reachable (Redis records still seed).
 *
 * Env: REDIS_URL (or REDIS_HOST/REDIS_PORT/REDIS_PASSWORD), RPC_URL,
 *      SERVER_PRIVATE_KEY, CONTRACT_NETWORK (default localhost).
 */

const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');
const { ethers } = require('ethers');

const NETWORK = process.env.CONTRACT_NETWORK || 'localhost';
const TTL = 365 * 24 * 60 * 60; // 1 year

const CATEGORY_ENUM = { Personal: 0, Financial: 1, Health: 2, Behavioral: 3, Commercial: 4, Other: 5 };

const DATASETS = [
  {
    id: 'demo_health_cardiology',
    name: 'Hospital A — Cardiology Vitals',
    description: 'De-identified resting heart-rate and blood-pressure readings from 1,200 cardiology patients.',
    category: 'Health',
    tags: ['healthcare', 'cardiology', 'vitals'],
    amount: 0.5,
  },
  {
    id: 'demo_finance_transactions',
    name: 'FinBank — Anonymised Transactions',
    description: 'Tokenised retail transaction amounts across 6 merchant categories, fully anonymised.',
    category: 'Financial',
    tags: ['fintech', 'transactions', 'aml'],
    amount: 0.8,
  },
  {
    id: 'demo_behavioral_mobility',
    name: 'Telco — Mobility Patterns',
    description: 'Aggregated cell-tower dwell times representing anonymised population mobility.',
    category: 'Behavioral',
    tags: ['telco', 'mobility', 'geospatial'],
    amount: 0.3,
  },
];

function makeRedis() {
  if (process.env.REDIS_URL) return new Redis(process.env.REDIS_URL);
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  });
}

function dataset(d) {
  const now = new Date().toISOString();
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    category: d.category,
    size: 2_000_000,
    format: 'text/csv',
    metadata: {
      tags: d.tags,
      industry: d.category,
      region: 'global',
      qualityScore: 92,
      licenseType: 'commercial',
      usageRestrictions: ['aggregate-only', 'no-redistribution'],
    },
    privacy: {
      encryptionLevel: 'advanced',
      anonymizationLevel: 'advanced',
      accessControls: ['auditor-approval'],
      retentionPolicy: { duration: 365, autoDelete: false },
    },
    compliance: { gdpr: true, ccpa: true, hipaa: d.category === 'Health', sox: false, custom: {} },
    pricing: { model: 'one-time', amount: d.amount, currency: 'ETH' },
    status: 'approved',
    providerId: 'demo-provider',
    createdAt: now,
    updatedAt: now,
  };
}

function loadChain() {
  try {
    const dir = path.join(__dirname, '..', 'deployments');
    const addresses = JSON.parse(fs.readFileSync(path.join(dir, `${NETWORK}-addresses.json`), 'utf8'));
    const abis = JSON.parse(fs.readFileSync(path.join(dir, `${NETWORK}-abis.json`), 'utf8'));
    if (!process.env.RPC_URL || !process.env.SERVER_PRIVATE_KEY) return null;
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const signer = new ethers.NonceManager(new ethers.Wallet(process.env.SERVER_PRIVATE_KEY, provider));
    return new ethers.Contract(addresses.DataRegistry, abis.DataRegistry, signer);
  } catch (e) {
    console.warn('[seed] chain unavailable, seeding Redis only:', e.message);
    return null;
  }
}

async function main() {
  const redis = makeRedis();
  const registry = loadChain();

  for (const d of DATASETS) {
    const rec = dataset(d);

    if (registry) {
      try {
        const dataHash = ethers.keccak256(ethers.toUtf8Bytes(`smpc:dataset:${d.id}`));
        // Skip if already registered (idempotent across reboots).
        const exists = await registry.dataExists(dataHash).catch(() => false);
        if (!exists) {
          const tx = await registry.registerData(
            dataHash, `ipfs://demo/${d.id}`, ethers.parseEther(String(d.amount)),
            CATEGORY_ENUM[d.category] ?? 5, d.tags, true, 2_000_000n
          );
          const r = await tx.wait();
          const act = await registry.changeDataStatus(dataHash, 1);
          await act.wait();
          rec.onchain = { dataHash, txHash: tx.hash, blockNumber: r.blockNumber, status: 'registered' };
          console.log(`[seed] registered ${d.id} on-chain @ block ${r.blockNumber}`);
        } else {
          rec.onchain = { dataHash, status: 'registered' };
          console.log(`[seed] ${d.id} already on-chain`);
        }
      } catch (e) {
        console.warn(`[seed] on-chain registration failed for ${d.id}:`, e.message);
      }
    }

    await redis.setex(`dataset:${rec.id}`, TTL, JSON.stringify(rec));
    console.log(`[seed] dataset ${rec.id} -> Redis (status=approved)`);
  }

  // One approved aggregation algorithm consumers can execute.
  const algo = {
    id: 'demo_algo_secure_mean',
    name: 'Secure Mean (SMPC)',
    description: 'Computes the mean of a numeric column via Shamir secret sharing across 3 nodes.',
    computation_type: 'third_party',
    status: 'approved',
    author_address: 'demo-provider',
    code: 'return aggregate(data, "mean")',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await redis.setex(`algorithm:${algo.id}`, TTL, JSON.stringify(algo));
  await redis.sadd('index:algorithms:status:approved', algo.id).catch(() => {});
  console.log(`[seed] algorithm ${algo.id} -> Redis (status=approved)`);

  await redis.quit();
  console.log('[seed] done.');
}

main().catch((e) => {
  console.error('[seed] failed:', e);
  process.exit(1);
});
