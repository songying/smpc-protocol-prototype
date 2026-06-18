/**
 * Rich demo seed — populates Redis so every dashboard list, table and chart
 * shows realistic, non-empty content for screenshots / a live walkthrough.
 *
 * Grounded in the thesis evaluation cohort (Appendix B / interviews I1–I3,
 * respondents E1–E7): payment-gateway anti-fraud (I2), cross-platform ad
 * attribution & security telemetry (I1), game-publishing telemetry (I3),
 * plus health (cardiology / screening) and FinTech (E4) sectors.
 *
 * Writes — using the EXACT key patterns / record shapes each API route reads:
 *   dataset:{id}                     (JSON)            -> /api/data            (Discover Data)
 *   algorithm:{id} + index:user|status|computation_type:* (JSON+sets)
 *                                                       -> /api/algorithms, /api/analytics/algorithms
 *   audit:{id}     + index:audit_algorithm|auditor|status:* (JSON+sets)
 *                                                       -> /api/audits         (Auditor dashboard)
 *   computation:{id}                 (JSON)            -> /api/computation     (My Requests)
 *   notifications:{addr} (list) + notification:{id} (hash)
 *                                                       -> /api/notifications
 *   sample:{id} + index:sample_owner|sample_public      -> /api/sample-data
 *
 * Per-user data (notifications, computation requests, "my" algorithms/datasets)
 * is keyed to DEMO_ADDRESS. Default = Hardhat account #0 (the demo relayer /
 * deployer). To populate for the wallet you actually connect in MetaMask:
 *   DEMO_ADDRESS=0xYourAddress node scripts/seed-demo-rich.cjs
 *
 * Idempotent: fixed ids, safe to re-run. Env: REDIS_URL (or REDIS_HOST/PORT).
 */

const Redis = require('ioredis');

// Hardhat account #0 — the public, deterministic demo/relayer account.
// The app lowercases every wallet address (auth, notification keys, indexes),
// so we MUST seed under the lowercase form or the UI reads nothing.
const DEMO_ADDRESS = (process.env.DEMO_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266').toLowerCase();
const AUDITOR_ADDRESS = (process.env.AUDITOR_ADDRESS || DEMO_ADDRESS).toLowerCase();
// Stable user id so login reuses this record (instead of minting a random one).
// Role 'admin' + a roles array makes every dashboard's API return data:
// admin bypasses the per-user requesterId/providerId filters and satisfies the
// auditor gate, while the client-side RoleContext still drives which dashboard
// is shown (so Provider/Consumer/Auditor screenshots look correct).
const USER_ID = 'user_demo_2266';

const now = Date.now();
const iso = (msAgo = 0) => new Date(now - msAgo).toISOString();
const H = 3600 * 1000, D = 24 * H;

function makeRedis() {
  if (process.env.REDIS_URL) return new Redis(process.env.REDIS_URL);
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  });
}

// ── Datasets (Discover Data catalog) ──────────────────────────────────────
// Shape mirrors the existing seed-demo.cjs records (category capitalised;
// status 'approved' so data_consumers see them).
function dataset(d) {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    category: d.category,
    size: d.size ?? 2_000_000,
    format: 'text/csv',
    metadata: {
      tags: d.tags,
      industry: d.category,
      region: d.region || 'global',
      qualityScore: d.quality ?? 90,
      licenseType: 'commercial',
      usageRestrictions: ['aggregate-only', 'no-redistribution'],
    },
    privacy: {
      encryptionLevel: 'advanced',
      anonymizationLevel: 'differential',
      accessControls: ['auditor-approval'],
      retentionPolicy: { duration: 365, autoDelete: false },
    },
    compliance: { gdpr: true, ccpa: true, hipaa: d.category === 'Health', sox: d.category === 'Financial', custom: {} },
    pricing: { model: 'one-time', amount: d.amount, currency: 'ETH' },
    status: d.status || 'approved',
    providerId: d.providerId || 'demo-provider',
    recordCount: d.records ?? 1200,
    createdAt: iso(d.ageDays * D),
    updatedAt: iso((d.ageDays - 1) * D),
  };
}

const DATASETS = [
  // Financial (E4 FinTech, I2 payment gateway) — anti-fraud / AML / settlement
  { id: 'demo_fin_paygateway_auth', name: 'PayGateway — Tokenised Auth Events', category: 'Financial',
    description: 'Tokenised payment-authorisation outcomes (approve/decline/risk-score) across acquirers, fully de-identified.',
    tags: ['payments', 'anti-fraud', 'risk-scoring'], amount: 0.9, records: 4_200_000, size: 6_800_000, quality: 94, ageDays: 9 },
  { id: 'demo_fin_settlement_vol', name: 'CardNet — Cross-Border Settlement Volumes', category: 'Financial',
    description: 'Daily aggregated cross-border settlement volumes by corridor; no card or identity fields retained.',
    tags: ['fintech', 'settlement', 'aml'], amount: 0.7, records: 900_000, size: 2_100_000, quality: 91, ageDays: 7 },
  // Behavioral (I1 ad/mobile-cloud, I3 game publishing)
  { id: 'demo_beh_ad_attribution', name: 'AdCloud — Cross-Platform Attribution Signals', category: 'Behavioral',
    description: 'Hashed cross-platform conversion/attribution signals for audience overlap and lift estimation.',
    tags: ['advertising', 'attribution', 'audience'], amount: 0.6, records: 3_500_000, size: 5_400_000, quality: 88, ageDays: 6 },
  { id: 'demo_beh_game_telemetry', name: 'GamePub — Player Session Telemetry', category: 'Behavioral',
    description: 'Aggregated player session lengths and progression events for churn and cohort analysis.',
    tags: ['gaming', 'telemetry', 'churn'], amount: 0.4, records: 2_800_000, size: 3_900_000, quality: 86, ageDays: 5 },
  // Health (cardiology + screening synthetic data already in data/)
  { id: 'demo_health_screening', name: 'ClinicNet — Anonymised Screening Panel', category: 'Health',
    description: 'De-identified medical-screening panel (vitals, BMI, lipid markers) over 1,000 examinations.',
    tags: ['healthcare', 'screening', 'vitals'], amount: 0.55, records: 1_000, size: 1_400_000, quality: 95, ageDays: 4 },
  // Commercial / Other (I1 security telemetry, E7 new media)
  { id: 'demo_com_threat_telemetry', name: 'ThreatGrid — Security Telemetry Aggregates', category: 'Commercial',
    description: 'Cross-provider security-telemetry counts (threat categories, no raw logs or infrastructure detail).',
    tags: ['security', 'telemetry', 'threat-intel'], amount: 0.65, records: 1_700_000, size: 2_600_000, quality: 90, ageDays: 8 },
  { id: 'demo_com_content_cohorts', name: 'ContentCo — Engagement Cohorts', category: 'Commercial',
    description: 'Anonymised content-engagement cohorts (dwell, completion) for new-media collaboration.',
    tags: ['media', 'engagement', 'cohorts'], amount: 0.35, records: 1_300_000, size: 1_800_000, quality: 84, ageDays: 3 },
  // Provider-owned (status mix) so a provider connected as DEMO_ADDRESS sees "My Datasets"
  { id: 'demo_mine_fin_lending', name: 'My Dataset — Lending Risk Features', category: 'Financial',
    description: 'Aggregated lending-risk feature counts pending auditor approval before listing.',
    tags: ['fintech', 'lending', 'risk'], amount: 0.5, records: 600_000, size: 1_100_000, quality: 89, ageDays: 2,
    status: 'pending_review', providerId: DEMO_ADDRESS },
  { id: 'demo_mine_health_draft', name: 'My Dataset — Wearable Vitals (draft)', category: 'Health',
    description: 'Draft listing of anonymised wearable resting heart-rate aggregates.',
    tags: ['healthcare', 'wearable', 'vitals'], amount: 0.45, records: 250_000, size: 700_000, quality: 87, ageDays: 1,
    status: 'draft', providerId: DEMO_ADDRESS },
];

// ── Algorithms (registry + analytics) ─────────────────────────────────────
// Shape per src/lib/database/algorithm-schemas.ts Algorithm interface.
function algorithm(a) {
  return {
    id: a.id,
    user_address: a.user_address || DEMO_ADDRESS,
    name: a.name,
    description: a.description,
    encrypted_code: a.encrypted_code || 'enc:demo:' + Buffer.from(a.id).toString('base64'),
    computation_type: a.computation_type, // third_party | zk | fhe
    version: a.version || '1.0.0',
    status: a.status,                      // pending | approved | rejected | under_review
    created_at: iso(a.ageDays * D),
    updated_at: iso((a.ageDays - 1) * D),
  };
}

const ALGORITHMS = [
  { id: 'demo_algo_secure_mean_v2', name: 'Secure Mean (SMPC)', computation_type: 'third_party', status: 'approved', ageDays: 12,
    description: 'Mean of a numeric column via Shamir secret sharing (t=2, n=3). Used by the live demo.' },
  { id: 'demo_algo_fraud_overlap', name: 'Cross-Institution Fraud Overlap', computation_type: 'third_party', status: 'approved', ageDays: 10,
    description: 'Private dot-product over hashed identifiers to estimate shared fraud signals without exposing customer lists.' },
  { id: 'demo_algo_audience_overlap', name: 'Audience Overlap Estimation', computation_type: 'third_party', status: 'approved', ageDays: 8,
    description: 'Private set-intersection cardinality for cross-platform audience overlap and attribution lift.' },
  { id: 'demo_algo_zk_sumcheck', name: 'ZK Sum-Check Verifier', computation_type: 'zk', status: 'approved', ageDays: 7,
    description: 'Groth16 circuit (SumCheck(10)) proving an aggregate was computed correctly; verified on-chain (~213.7k gas).' },
  { id: 'demo_algo_private_variance', name: 'Private Set Variance', computation_type: 'third_party', status: 'under_review', ageDays: 4,
    description: 'Variance over secret-shared inputs using Beaver triples; multiplicative-depth aware.' },
  { id: 'demo_algo_fhe_count', name: 'FHE Aggregate Count (BFV)', computation_type: 'fhe', status: 'pending', ageDays: 3,
    description: 'Homomorphic count over BFV-encrypted inputs (Microsoft SEAL, poly-modulus 8192).' },
  { id: 'demo_algo_churn_cohort', name: 'Player Churn Cohort Count', computation_type: 'third_party', status: 'rejected', ageDays: 6,
    description: 'Cohort churn counts; rejected pending tighter output bounds to limit inference on small cohorts.' },
];

// ── Algorithm audits (Auditor dashboard; 'assigned' => pending queue) ──────
function audit(a) {
  return {
    id: a.id,
    algorithm_id: a.algorithm_id,
    auditor_address: AUDITOR_ADDRESS,
    status: a.status,                      // assigned | in_review | approved | request_changes | rejected
    comments: a.comments || '',
    assigned_at: iso(a.ageDays * D),
    completed_at: a.completed ? iso((a.ageDays - 1) * D) : undefined,
    priority: a.priority,                  // low | medium | high
    audit_checklist: a.checklist || { input_privacy: true, output_bounds: a.status === 'approved', collusion_threshold: true },
  };
}

const AUDITS = [
  { id: 'demo_audit_variance', algorithm_id: 'demo_algo_private_variance', status: 'assigned', priority: 'high', ageDays: 2,
    comments: 'Awaiting review: confirm multiplicative-depth and output-bound safety.' },
  { id: 'demo_audit_fhe_count', algorithm_id: 'demo_algo_fhe_count', status: 'assigned', priority: 'medium', ageDays: 1,
    comments: 'Awaiting review: validate BFV parameter choice and single-key scope disclosure.' },
  { id: 'demo_audit_churn', algorithm_id: 'demo_algo_churn_cohort', status: 'request_changes', priority: 'medium', ageDays: 5, completed: true,
    comments: 'Tighten output bounds; small-cohort counts risk re-identification.' },
  { id: 'demo_audit_overlap', algorithm_id: 'demo_algo_audience_overlap', status: 'approved', priority: 'low', ageDays: 8, completed: true,
    comments: 'Approved: PSI cardinality only; no element disclosure.' },
  { id: 'demo_audit_fraud', algorithm_id: 'demo_algo_fraud_overlap', status: 'in_review', priority: 'high', ageDays: 3,
    comments: 'In review: collusion threshold and acquirer governance diversity.' },
];

// ── Computation requests ("My Requests"; per requester) ───────────────────
// Shape per src/lib/api/types.ts ComputationRequest.
function computation(c) {
  const rec = {
    id: c.id,
    title: c.title,
    description: c.description,
    datasets: c.datasets,
    algorithm: {
      type: c.algoType || 'secure_multiparty_computation',
      name: c.algoName,
      version: '1.0.0',
      description: c.algoName,
      parameters: [],
      requirements: { minDatasets: 1, requiredDataTypes: [], computeRequirements: { memory: 512, cpu: 2, estimatedTime: 30 } },
    },
    parameters: { operation: c.operation || 'mean', backend: c.backend || 'mpspdz' },
    privacy: { noiseLevel: 'low', resultAggregation: c.operation === 'count' ? 'count' : 'average' },
    budget: { maxCost: c.budget, currency: 'ETH', priority: 'normal' },
    status: c.status,                      // pending | approved | computing | completed | failed
    requesterId: USER_ID,
    createdAt: iso(c.ageHours * H),
    updatedAt: iso((c.ageHours - 1) * H),
  };
  if (c.status === 'completed') {
    rec.completedAt = iso((c.ageHours - 2) * H);
    rec.results = {
      resultHash: c.resultHash,
      encryptedResult: 'enc:' + c.id,
      proof: { proof: '0x' + 'a1'.repeat(32), publicSignals: [String(c.result)], verificationKey: 'vk:SumCheck(10)' },
      metrics: { executionTime: c.execMs, memoryUsed: 384, cpuUsage: 62, dataProcessed: 2_000_000, accuracy: 1.0 },
      auditTrail: [],
    };
  }
  return rec;
}

const COMPUTATIONS = [
  { id: 'demo_req_aml_aggregate', title: 'Quarterly AML risk aggregate', status: 'completed', ageHours: 30,
    description: 'Mean risk score across acquirers via SMPC; settled on-chain under the 70/25/4/1 split.',
    datasets: ['demo_fin_paygateway_auth', 'demo_fin_settlement_vol'], algoName: 'Secure Mean (SMPC)',
    operation: 'mean', backend: 'mpspdz', budget: 0.01, result: 70.3, execMs: 1840,
    resultHash: '0x96fa76d23779b7b4166309aadcf1ee7997af1a1088610a89d6a01e0783ea9ff6' },
  { id: 'demo_req_audience_lift', title: 'Cross-platform attribution lift', status: 'completed', ageHours: 20,
    description: 'Audience overlap cardinality between two ad platforms for attribution lift.',
    datasets: ['demo_beh_ad_attribution'], algoName: 'Audience Overlap Estimation',
    operation: 'count', backend: 'mpspdz', budget: 0.008, result: 184_532, execMs: 2110,
    resultHash: '0x4b1f2c' + '00'.repeat(29) },
  { id: 'demo_req_fraud_overlap', title: 'Joint fraud-overlap study', status: 'computing', ageHours: 1,
    description: 'Private dot-product of hashed identifiers across two payment institutions.',
    datasets: ['demo_fin_paygateway_auth'], algoName: 'Cross-Institution Fraud Overlap',
    operation: 'dotProduct', backend: 'mpspdz', budget: 0.012 },
  { id: 'demo_req_cardio_mean', title: 'Cardiology cohort mean BP', status: 'approved', ageHours: 4,
    description: 'Mean resting blood pressure across a de-identified cardiology cohort.',
    datasets: ['demo_health_screening'], algoName: 'Secure Mean (SMPC)',
    operation: 'mean', backend: 'mpspdz', budget: 0.006 },
  { id: 'demo_req_churn_variance', title: 'Player churn variance', status: 'pending', ageHours: 2,
    description: 'Variance of session-length cohorts for churn modelling (awaiting auditor approval).',
    datasets: ['demo_beh_game_telemetry'], algoName: 'Private Set Variance',
    operation: 'variance', backend: 'mpspdz', budget: 0.007 },
  { id: 'demo_req_threat_count', title: 'Cross-provider threat-pattern count', status: 'pending', ageHours: 6,
    description: 'Aggregate count of shared threat categories across security providers.',
    datasets: ['demo_com_threat_telemetry'], algoName: 'FHE Aggregate Count (BFV)',
    operation: 'count', backend: 'fhe', budget: 0.009 },
];

// ── Notifications (bell + page) ───────────────────────────────────────────
const NOTIFICATIONS = [
  { id: 'demo_ntf_1', type: 'computation_completed', read: false, ageHours: 1,
    title: 'Computation completed', message: 'Quarterly AML risk aggregate finished. Result verified on-chain (213,732 gas).',
    data: { requestId: 'demo_req_aml_aggregate', gasUsed: 213732 } },
  { id: 'demo_ntf_2', type: 'payment_received', read: false, ageHours: 1,
    title: 'Settlement received', message: 'Provider share of 0.0070 ETH settled (70% of 0.01 ETH under the 70/25/4/1 split).',
    data: { amount: 0.007, split: '70/25/4/1' } },
  { id: 'demo_ntf_3', type: 'algorithm_approved', read: false, ageHours: 5,
    title: 'Algorithm approved', message: 'Audience Overlap Estimation passed auditor review and is now executable.',
    data: { algorithmId: 'demo_algo_audience_overlap' } },
  { id: 'demo_ntf_4', type: 'data_request', read: false, ageHours: 8,
    title: 'New access request', message: 'A consumer requested access to PayGateway — Tokenised Auth Events.',
    data: { datasetId: 'demo_fin_paygateway_auth' } },
  { id: 'demo_ntf_5', type: 'computation_completed', read: true, ageHours: 20,
    title: 'Computation completed', message: 'Cross-platform attribution lift finished (overlap = 184,532).',
    data: { requestId: 'demo_req_audience_lift' } },
  { id: 'demo_ntf_6', type: 'algorithm_rejected', read: true, ageHours: 30,
    title: 'Algorithm needs changes', message: 'Player Churn Cohort Count was rejected: tighten small-cohort output bounds.',
    data: { algorithmId: 'demo_algo_churn_cohort' } },
  { id: 'demo_ntf_7', type: 'system_alert', read: true, ageHours: 40,
    title: 'Node health', message: 'All 3 SMPC compute nodes healthy (Shamir t=2/n=3).' },
  { id: 'demo_ntf_8', type: 'computation_failed', read: true, ageHours: 50,
    title: 'Computation rejected', message: 'A tampered result was rejected by the ZK verifier and settlement was blocked.',
    data: { reason: 'proof_rejected' } },
  { id: 'demo_ntf_9', type: 'data_request', read: true, ageHours: 60,
    title: 'New access request', message: 'A consumer requested access to AdCloud — Cross-Platform Attribution Signals.',
    data: { datasetId: 'demo_beh_ad_attribution' } },
  { id: 'demo_ntf_10', type: 'payment_received', read: true, ageHours: 72,
    title: 'Settlement received', message: 'Compute-node share of 0.0025 ETH settled (25% under the 70/25/4/1 split).',
    data: { amount: 0.0025 } },
];

// ── Sample data (public sample browser) ───────────────────────────────────
const SAMPLES = [
  { id: 'demo_sample_health', data_structure: 'health_screening_v1',
    health_data: JSON.stringify({ schema: 'health_screening_v1', records: 1000, fields: ['age', 'bmi', 'systolicBP', 'heartRate'] }),
    is_public_sample: true, data_hash: '0x' + 'cd'.repeat(32) },
  { id: 'demo_sample_finance', data_structure: 'finance_txn_v1',
    health_data: JSON.stringify({ schema: 'finance_txn_v1', records: 2000, fields: ['amount', 'merchantCategory', 'riskScore'] }),
    is_public_sample: true, data_hash: '0x' + 'ef'.repeat(32) },
];

async function main() {
  const redis = makeRedis();
  console.log(`[seed-rich] demo address = ${DEMO_ADDRESS}`);

  // Stable admin user record so login reuses it (token carries role 'admin';
  // verifyAuth loads this record, so its roles array is honoured too).
  const userRec = {
    id: USER_ID,
    address: DEMO_ADDRESS,
    role: 'admin',
    roles: ['admin', 'auditor', 'data_provider', 'data_consumer'],
    createdAt: iso(30 * D),
    updatedAt: iso(0),
    lastLoginAt: iso(0),
    profile: {
      name: 'Demo Operator',
      organization: 'SMPC Protocol Demo',
      preferences: {
        theme: 'system',
        notifications: { email: true, push: true, browser: true },
        privacy: { showProfile: false, showActivity: false },
      },
    },
  };
  await redis.set(`user:${USER_ID}`, JSON.stringify(userRec));
  await redis.set(`user:address:${DEMO_ADDRESS}`, JSON.stringify(userRec));
  console.log(`[seed-rich] user record ${USER_ID} (admin) -> ${DEMO_ADDRESS}`);

  // Datasets
  for (const d of DATASETS) {
    await redis.set(`dataset:${d.id}`, JSON.stringify(dataset(d)));
  }
  console.log(`[seed-rich] datasets: ${DATASETS.length}`);

  // Algorithms + indexes
  for (const a of ALGORITHMS) {
    const rec = algorithm(a);
    await redis.set(`algorithm:${rec.id}`, JSON.stringify(rec));
    await redis.sadd(`index:user:${rec.user_address}`, rec.id);
    await redis.sadd(`index:status:${rec.status}`, rec.id);
    await redis.sadd(`index:computation_type:${rec.computation_type}`, rec.id);
  }
  console.log(`[seed-rich] algorithms: ${ALGORITHMS.length}`);

  // Algorithm audits + indexes
  for (const a of AUDITS) {
    const rec = audit(a);
    await redis.set(`audit:${rec.id}`, JSON.stringify(rec));
    await redis.sadd(`index:audit_algorithm:${rec.algorithm_id}`, rec.id);
    await redis.sadd(`index:audit_auditor:${rec.auditor_address}`, rec.id);
    await redis.sadd(`index:audit_status:${rec.status}`, rec.id);
  }
  console.log(`[seed-rich] algorithm audits: ${AUDITS.length} (pending/assigned drive the auditor queue)`);

  // Computation requests
  for (const c of COMPUTATIONS) {
    await redis.set(`computation:${c.id}`, JSON.stringify(computation(c)));
  }
  console.log(`[seed-rich] computation requests: ${COMPUTATIONS.length}`);

  // Notifications (list of ids + per-notification hash)
  const listKey = `notifications:${DEMO_ADDRESS}`;
  await redis.del(listKey);
  for (const n of NOTIFICATIONS) {
    await redis.hset(`notification:${n.id}`, {
      userId: DEMO_ADDRESS,
      type: n.type,
      title: n.title,
      message: n.message,
      data: JSON.stringify(n.data || {}),
      read: n.read ? 'true' : 'false',
      createdAt: iso(n.ageHours * H),
    });
    await redis.rpush(listKey, n.id);
  }
  console.log(`[seed-rich] notifications: ${NOTIFICATIONS.length} (${NOTIFICATIONS.filter(n => !n.read).length} unread)`);

  // Sample data + indexes
  for (const s of SAMPLES) {
    const rec = {
      id: s.id, owner_address: DEMO_ADDRESS, data_structure: s.data_structure,
      health_data: s.health_data, created_at: iso(3 * D), is_public_sample: s.is_public_sample, data_hash: s.data_hash,
    };
    await redis.set(`sample:${rec.id}`, JSON.stringify(rec));
    await redis.sadd(`index:sample_owner:${DEMO_ADDRESS}`, rec.id);
    if (rec.is_public_sample) await redis.sadd('index:sample_public', rec.id);
  }
  console.log(`[seed-rich] sample data: ${SAMPLES.length}`);

  await redis.quit();
  console.log('[seed-rich] done.');
}

main().catch((e) => { console.error('[seed-rich] failed:', e); process.exit(1); });
