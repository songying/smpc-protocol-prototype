import SecureComputationTerminal from '@/components/demo/SecureComputationTerminal'

export const metadata = {
  title: 'Secure Computation Terminal — SMPC Protocol',
  description: 'Run a live privacy-preserving aggregation across non-colluding nodes with on-chain settlement.',
}

export default function DemoPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <div className="chip mb-3">
          <span className="status-dot status-live" />
          Live vertical slice
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Privacy-preserving computation, end to end</h1>
        <p className="text-ink-muted mt-2 max-w-2xl">
          A single click runs the protocol&apos;s four phases live: <span className="text-ink">Phase I</span> registers a
          dataset on-chain; <span className="text-ink">Phase II</span> submits a computation request an auditor approves;
          <span className="text-ink"> Phase III</span> computes a secure result across three non-colluding MP-SPDZ nodes
          (Shamir t=2/n=3, Beaver triples for multiplicative ops) or over homomorphic FHE; and
          <span className="text-ink"> Phase IV</span> verifies a Groth16 proof on-chain and settles the fee under the
          70 / 25 / 4 / 1 split. Toggle <span className="text-rose-300">Tamper</span> to watch the proof and the audit
          hash-chain both reject the altered result.
        </p>
      </div>
      <SecureComputationTerminal />
    </div>
  )
}
