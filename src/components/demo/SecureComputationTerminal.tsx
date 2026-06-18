'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TxChip, LiveBadge } from '@/components/ui/onchain'
import { DonutSplit, CHART } from '@/components/charts'

type Op = 'sum' | 'mean' | 'count' | 'variance' | 'dotProduct'
type Backend = 'mpspdz' | 'fhe'

interface RunResult {
  datasetId: string
  inputCount: number
  registration: { live: boolean; txHash?: string; blockNumber?: number; dataHash?: string; error?: string }
  request: { live: boolean; requestId?: string; submitTxHash?: string; approveTxHash?: string; status?: string; error?: string }
  aggregation: {
    operation: Op; result: number; recordCount: number; durationMs: number; live: boolean; backend: Backend
    engine?: 'mp-spdz' | 'js-shamir'
    threshold?: number; numNodes?: number; prime?: string; beaverTriples?: number
    scheme?: string; polyModulusDegree?: number; noiseBudget?: number
    nodes: { nodeId: string; endpoint: string; shareIndex: number; shareCount: number; partial: string; rounds?: number }[]
  }
  zk: {
    live: boolean; verified: boolean; tampered: boolean; gasUsed?: string; circuit: string
    provenTotal: string; claimedTotal: string; proof?: { a: string[]; b: string[][]; c: string[] }; note: string; error?: string
  }
  settlement: { live: boolean; txHash?: string; blockNumber?: number; breakdown?: Record<string, string>; total?: string; blocked?: boolean; reason?: string }
  audit: {
    live: boolean; sessionId?: string; tampered?: boolean; recordCount?: number; headHash?: string
    verification?: { valid: boolean; brokenAt?: number | null; reason?: string }
    records?: { index: number; party: string; event: string; actor: string; hash: string; prevHash: string }[]; error?: string
  }
  onchainEnabled: boolean
}

const OPS: { id: Op; label: string }[] = [
  { id: 'sum', label: 'Sum' }, { id: 'mean', label: 'Mean' }, { id: 'count', label: 'Count' },
  { id: 'variance', label: 'Variance' }, { id: 'dotProduct', label: 'Dot product' },
]

// Sample datasets. `paired` is the second column used by dot-product (Σ aᵢ·bᵢ).
const DATASETS: { id: string; label: string; unit: string; values: number[]; paired: number[] }[] = [
  { id: 'finance', label: 'Finance', unit: 'tx amount ($)', values: [42, 17, 99, 5, 230, 81, 64, 38, 120, 7], paired: [1, 0, 1, 0, 1, 1, 0, 0, 1, 0] },
  { id: 'health', label: 'Health', unit: 'glucose (mg/dL)', values: [92, 110, 134, 88, 156, 102, 99, 145, 120, 77], paired: [1, 1, 0, 1, 0, 1, 1, 0, 0, 1] },
  { id: 'ads', label: 'Ads', unit: 'clicks/session', values: [3, 0, 5, 2, 8, 1, 4, 0, 6, 2], paired: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] },
]
const STEPS = ['Register', 'Request', 'Compute', 'Verify', 'Settle'] as const

function weiToEth(wei?: string) {
  if (!wei) return '0'
  try { return (Number(BigInt(wei)) / 1e18).toFixed(4) } catch { return '0' }
}

/** LIVE vs SIMULATED chip, used on every phase panel for honesty. */
function ProofChip({ live }: { live: boolean }) {
  return <LiveBadge live={live} />
}

function PhaseCard({ phase, title, live, children }: { phase: string; title: string; live?: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{phase}</Badge>
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
          </div>
          {live !== undefined && <ProofChip live={live} />}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

export default function SecureComputationTerminal() {
  const [operation, setOperation] = useState<Op>('mean')
  const [backend, setBackend] = useState<Backend>('mpspdz')
  const [datasetId, setDatasetId] = useState<string>('finance')
  const [tamper, setTamper] = useState(false)
  const dataset = DATASETS.find((d) => d.id === datasetId) || DATASETS[0]
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState(-1)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // FHE only supports additive ops; multiplicative ops force MP-SPDZ.
  const multiplicative = operation === 'variance' || operation === 'dotProduct'
  const effectiveBackend: Backend = multiplicative ? 'mpspdz' : backend

  async function run() {
    setRunning(true); setError(null); setResult(null); setStep(0)
    const timers = [400, 850, 1300, 1750].map((ms, i) => setTimeout(() => setStep(i + 1), ms))
    try {
      const res = await fetch('/api/demo/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation, backend: effectiveBackend, tamper,
          values: dataset.values,
          ...(operation === 'dotProduct' ? { valuesB: dataset.paired } : {}),
        }),
      })
      if (!res.ok) throw new Error(`server returned ${res.status}`)
      const data: RunResult = await res.json()
      timers.forEach(clearTimeout)
      setStep(STEPS.length)
      setResult(data)
    } catch (e) {
      timers.forEach(clearTimeout)
      setError(e instanceof Error ? e.message : 'run failed')
      setStep(-1)
    } finally {
      setRunning(false)
    }
  }

  const agg = result?.aggregation
  const zk = result?.zk
  const feeData = result?.settlement?.breakdown
    ? [
        { name: 'Provider 70%', value: Number(weiToEth(result.settlement.breakdown.provider)) },
        { name: 'Nodes 25%', value: Number(weiToEth(result.settlement.breakdown.nodes)) },
        { name: 'Validators 4%', value: Number(weiToEth(result.settlement.breakdown.validators)) },
        { name: 'Treasury 1%', value: Number(weiToEth(result.settlement.breakdown.treasury)) },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Control bar */}
      <Card className="overflow-hidden">
        <div className="bg-mesh">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink tracking-tight">Secure Computation Terminal</h2>
                <p className="text-sm text-ink-muted mt-0.5">
                  Runs the full thesis lifecycle: on-chain registration &amp; governance, a secure computation
                  (MP-SPDZ Shamir t=2/n=3 or homomorphic FHE), a Groth16 proof verified on-chain, and gated settlement.
                </p>
              </div>
              <Button onClick={run} disabled={running} size="lg">
                {running ? 'Computing…' : 'Run secure computation'}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-4">
              {/* Dataset */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-faint w-16">Dataset</span>
                <div className="inline-flex rounded-lg border border-line bg-surface-inset p-1">
                  {DATASETS.map((d) => (
                    <button key={d.id} onClick={() => setDatasetId(d.id)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        datasetId === d.id ? 'bg-surface-raised text-ink border border-line' : 'text-ink-muted hover:text-ink'
                      }`}>{d.label}</button>
                  ))}
                </div>
                <span className="text-[11px] text-ink-faint">{dataset.unit} · n={dataset.values.length}</span>
              </div>
              {/* Operation */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-faint w-16">Algorithm</span>
                <div className="inline-flex rounded-lg border border-line bg-surface-inset p-1">
                  {OPS.map((op) => (
                    <button key={op.id} onClick={() => setOperation(op.id)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        operation === op.id ? 'bg-surface-raised text-ink border border-line' : 'text-ink-muted hover:text-ink'
                      }`}>{op.label}</button>
                  ))}
                </div>
              </div>
              {/* Backend */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-faint w-16">Backend</span>
                <div className="inline-flex rounded-lg border border-line bg-surface-inset p-1">
                  {(['mpspdz', 'fhe'] as Backend[]).map((b) => (
                    <button key={b} onClick={() => setBackend(b)} disabled={multiplicative && b === 'fhe'}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors disabled:opacity-40 ${
                        effectiveBackend === b ? 'bg-surface-raised text-ink border border-line' : 'text-ink-muted hover:text-ink'
                      }`}>{b === 'mpspdz' ? 'MP-SPDZ' : 'FHE'}</button>
                  ))}
                </div>
                {multiplicative && <span className="text-[11px] text-ink-faint">multiplicative → MP-SPDZ (Beaver triples)</span>}
              </div>
              {/* Tamper */}
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={tamper} onChange={(e) => setTamper(e.target.checked)} className="accent-rose-500" />
                <span className={tamper ? 'text-rose-300' : 'text-ink-muted'}>Tamper the result</span>
              </label>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Lifecycle stepper */}
      <div className="grid grid-cols-5 gap-2">
        {STEPS.map((label, i) => {
          const active = step > i
          const current = step === i + 1 && running
          return (
            <div key={label} className="flex flex-col items-center text-center">
              <div className={`w-full h-1.5 rounded-full mb-2 transition-all duration-300 ${
                active ? 'bg-gradient-to-r from-brand-primary to-brand-secondary' : 'bg-surface-inset'
              } ${current ? 'animate-pulse-soft' : ''}`} />
              <span className={`text-xs ${active ? 'text-ink' : 'text-ink-faint'}`}>{label}</span>
            </div>
          )
        })}
      </div>

      {error && <Card><CardContent className="p-4 text-sm text-rose-300">Run failed: {error}</CardContent></Card>}

      {result && agg && zk && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in">
          {/* Left: result + compute + verify */}
          <div className="lg:col-span-2 space-y-5">
            {/* Result headline */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink-muted">Result</span>
                    <Badge variant="secondary" className="capitalize">{agg.operation}</Badge>
                    <Badge variant={agg.backend === 'fhe' ? 'warning' : 'default'}>
                      {agg.backend === 'fhe'
                        ? 'FHE · SEAL BFV'
                        : agg.engine === 'mp-spdz'
                          ? 'MP-SPDZ · shamir-party.x'
                          : 'Shamir (JS fallback)'}
                    </Badge>
                  </div>
                  <LiveBadge live={agg.live} />
                </div>
                <div className="flex items-end gap-3">
                  <span className="nums text-4xl font-semibold text-gradient">
                    {Number(agg.result).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm text-ink-muted mb-1.5">over {agg.recordCount} records · {agg.durationMs}ms</span>
                </div>
                {agg.backend === 'mpspdz' ? (
                  <p className="text-xs text-ink-faint mt-3">
                    {agg.beaverTriples
                      ? `Secure multiplication: ${agg.beaverTriples} Beaver triples consumed across 2 rounds (open d,e → combine). `
                      : `Reconstructed via Lagrange interpolation from t=${agg.threshold ?? 2} of n=${agg.numNodes ?? 3} partials. `}
                    {agg.prime && <>Field prime {agg.prime}.</>}
                  </p>
                ) : (
                  <p className="text-xs text-ink-faint mt-3">
                    Homomorphic {agg.scheme} (poly modulus {agg.polyModulusDegree}); inputs encrypted, summed as
                    ciphertexts, only the aggregate decrypted{typeof agg.noiseBudget === 'number' ? ` · ${agg.noiseBudget}-bit noise budget remaining` : ''}.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Phase III — Compute */}
            <PhaseCard phase="Phase III" title={agg.backend === 'fhe' ? 'Confidential computation (FHE)' : 'Secure computation (MP-SPDZ)'} live={agg.live}>
              {agg.backend === 'mpspdz' ? (
                <>
                  <p className="text-xs mb-2">
                    {agg.engine === 'mp-spdz'
                      ? <span className="text-emerald-300">Real MP-SPDZ framework (shamir-party.x) via external-client I/O — the client secret-shares inputs; parties see only shares.</span>
                      : <span className="text-amber-300">JS Shamir fallback (real MP-SPDZ parties unavailable in this environment).</span>}
                  </p>
                  <p className="text-xs text-ink-faint mb-3">
                    Each value is split into {agg.numNodes ?? 3} shares with a degree-{(agg.threshold ?? 2) - 1} polynomial;
                    node j receives only the j-th share of every value. A single node — or any t-1 = {(agg.threshold ?? 2) - 1} —
                    learns nothing.
                  </p>
                  {agg.nodes.length === 0 ? (
                    <p className="text-sm text-ink-muted">Count is public metadata — no secret sharing required.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {agg.nodes.map((n) => (
                        <div key={n.nodeId} className="rounded-lg border border-line bg-surface-inset p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-ink">Node {n.nodeId}</span>
                            <span className="status-dot status-live" />
                          </div>
                          <div className="mt-2 space-y-1 text-xs">
                            <div className="flex justify-between text-ink-muted"><span>shares held</span><span className="nums text-ink">{n.shareCount}</span></div>
                            <div className="flex justify-between text-ink-muted"><span>partial</span><span className="nums text-brand-secondary">{n.partial.slice(0, 8)}…</span></div>
                            <div className="flex justify-between text-ink-muted"><span>rounds</span><span className="nums text-ink">{n.rounds ?? 1}</span></div>
                          </div>
                          <p className="text-[11px] text-ink-faint mt-2 leading-snug">Saw only random field elements — never a raw value.</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span className="text-ink-muted">Scheme</span><span className="text-ink">{agg.scheme} (single-key)</span></div>
                  <div className="flex items-center justify-between"><span className="text-ink-muted">Poly modulus degree</span><span className="nums text-ink">{agg.polyModulusDegree}</span></div>
                  {typeof agg.noiseBudget === 'number' && (
                    <div className="flex items-center justify-between"><span className="text-ink-muted">Noise budget remaining</span><span className="nums text-emerald-300">{agg.noiseBudget} bits</span></div>
                  )}
                  <p className="text-[11px] text-ink-faint pt-1">encrypt → homomorphic add (ciphertexts never decrypted) → decrypt only the aggregate.</p>
                </div>
              )}
            </PhaseCard>

            {/* Phase IV — Verification (Groth16) */}
            <PhaseCard phase="Phase IV" title="Verification (Groth16 zk-SNARK)" live={zk.live}>
              <div className="flex items-center gap-3 mb-3">
                {zk.verified
                  ? <Badge variant="success">✓ proof verified on-chain</Badge>
                  : <Badge variant="destructive">✗ proof rejected</Badge>}
                {zk.gasUsed && <span className="text-xs text-ink-muted nums">{Number(zk.gasUsed).toLocaleString()} gas</span>}
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-ink-muted"><span>circuit</span><span className="text-ink">{zk.circuit}</span></div>
                <div className="flex justify-between text-ink-muted"><span>public signal (claimed total)</span>
                  <span className={`nums ${zk.tampered ? 'text-rose-300' : 'text-ink'}`}>{zk.claimedTotal}{zk.tampered ? ` (proof attests ${zk.provenTotal})` : ''}</span>
                </div>
                {zk.proof && (
                  <div className="flex justify-between text-ink-muted"><span>proof π</span>
                    <span className="nums text-brand-secondary">a={zk.proof.a[0].slice(0, 10)}…</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-ink-faint mt-3 leading-snug">{zk.note}</p>
            </PhaseCard>
          </div>

          {/* Right: registration/request, settlement, audit */}
          <div className="space-y-5">
            {/* Phase I + II — on-chain registration & governance */}
            <PhaseCard phase="Phase I–II" title="Registration &amp; governance" live={result.registration.live || result.request.live}>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Data registration</span>
                  {result.registration.txHash ? <TxChip hash={result.registration.txHash} label="reg" /> : <Badge variant="warning">off-chain</Badge>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Request</span>
                  {result.request.submitTxHash ? <TxChip hash={result.request.submitTxHash} label="req" /> : <Badge variant="warning">off-chain</Badge>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Governance status</span>
                  {result.request.status
                    ? <Badge variant={result.request.status === 'Approved' ? 'success' : 'secondary'}>{result.request.status}</Badge>
                    : <Badge variant="secondary">—</Badge>}
                </div>
              </div>
            </PhaseCard>

            {/* Settlement */}
            <PhaseCard phase="Phase IV" title="Settlement" live={result.settlement.live}>
              {result.settlement.blocked ? (
                <div className="text-sm text-rose-300">
                  Settlement blocked — {result.settlement.reason || 'proof did not verify'}.
                  <p className="text-[11px] text-ink-faint mt-1">A tampered result cannot be settled: the proof gates payment.</p>
                </div>
              ) : feeData.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-ink-faint">Enforced split 70 / 25 / 4 / 1</p>
                    {result.settlement.txHash && <TxChip hash={result.settlement.txHash} label="settle" />}
                  </div>
                  <DonutSplit data={feeData} />
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    {[['Provider', CHART.teal, '70%'], ['Nodes', CHART.blue, '25%'], ['Validators', CHART.violet, '4%'], ['Treasury', CHART.amber, '1%']].map(([name, color, pct]) => (
                      <div key={name as string} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color as string }} />
                        <span className="text-ink-muted">{name}</span><span className="nums text-ink ml-auto">{pct}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-ink-muted">Settlement off-chain in this environment.</p>
              )}
            </PhaseCard>

            {/* Audit trail */}
            <PhaseCard phase="Audit" title="Tamper-evident trail" live={!!result.audit.live}>
              {result.audit.verification ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    {result.audit.verification.valid
                      ? <Badge variant="success">✓ chain intact</Badge>
                      : <Badge variant="destructive">✗ broken at record {result.audit.verification.brokenAt}</Badge>}
                    <span className="text-xs text-ink-muted">{result.audit.recordCount} signed records</span>
                  </div>
                  {!result.audit.verification.valid && (
                    <p className="text-[11px] text-rose-300 mb-2">reason: {result.audit.verification.reason}</p>
                  )}
                  <div className="space-y-1">
                    {(result.audit.records || []).map((r) => {
                      const broken = !result.audit.verification!.valid && result.audit.verification!.brokenAt === r.index
                      return (
                        <div key={r.index} className={`flex items-center justify-between text-[11px] rounded px-2 py-1 ${broken ? 'bg-rose-500/10 text-rose-300' : 'text-ink-muted'}`}>
                          <span>{r.index}. {r.party} · {r.event}</span>
                          <span className="nums">{r.hash.slice(0, 8)}…</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-ink-muted">Audit trail unavailable.</p>
              )}
            </PhaseCard>
          </div>
        </div>
      )}
    </div>
  )
}
