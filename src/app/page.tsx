import Link from 'next/link';

const FEATURES = [
  {
    title: 'Secure Multi-Party Computation',
    body: 'Shamir secret sharing (t=2, n=3) computes on data split across non-colluding nodes — raw inputs never leave the provider.',
    accent: 'from-brand-primary/20 to-transparent',
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  },
  {
    title: 'On-chain Settlement',
    body: 'Eight Solidity contracts orchestrate registration, governance and a fee split enforced on-chain: 70 / 25 / 4 / 1.',
    accent: 'from-brand-secondary/20 to-transparent',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    title: 'Audit by Design',
    body: 'Every computation passes an auditor gate and leaves an immutable trail — compliance is a first-class protocol primitive.',
    accent: 'from-brand-accent/20 to-transparent',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
];

const KPIS = [
  { label: 'Common-query latency', value: '3–5s', sub: '@ 10k records' },
  { label: 'Deployment cost (L2)', value: '−99%', sub: '$2,150 → $21.50' },
  { label: 'Throughput', value: '90/min', sub: '3 nodes' },
  { label: 'Fee to provider', value: '70%', sub: 'enforced on-chain' },
];

const USE_CASES = [
  ['Healthcare', 'Joint medical research and epidemiology without exposing patient records.'],
  ['Finance', 'Cross-institution fraud and risk models without sharing raw transactions.'],
  ['Technology', 'Federated analytics and benchmarking over private, distributed data.'],
  ['Government', 'Inter-agency and demographic analysis while protecting citizen privacy.'],
];

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden bg-mesh">
        <div className="absolute inset-0 bg-grid-fade [background-size:24px_24px] opacity-60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="max-w-3xl">
            <div className="chip mb-5">
              <span className="status-dot status-live" />
              Privacy-preserving data trading · SMPC + Web3
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-ink leading-[1.05]">
              Trade the <span className="text-gradient">value</span> of data,
              <br /> not the data itself.
            </h1>
            <p className="text-lg md:text-xl text-ink-muted mt-6 max-w-2xl">
              A secure multi-party computation platform where institutions monetise insights from
              private data — computed across non-colluding nodes and settled on-chain.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-brand-primary text-surface-base font-semibold hover:bg-teal-300 hover:shadow-glow transition-all"
              >
                Launch live demo →
              </Link>
              <Link
                href="/auth"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-line-strong text-ink hover:bg-surface-inset transition-colors"
              >
                Connect wallet
              </Link>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-14">
            {KPIS.map((k) => (
              <div key={k.label} className="glass rounded-xl p-4">
                <div className="nums text-2xl font-semibold text-ink">{k.value}</div>
                <div className="text-sm text-ink-muted mt-1">{k.label}</div>
                <div className="text-xs text-ink-faint mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className={`card-surface p-6 bg-gradient-to-b ${f.accent}`}>
              <div className="w-11 h-11 rounded-lg bg-surface-inset border border-line flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">{f.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-2xl md:text-3xl font-semibold text-ink mb-2">Real-world applications</h2>
        <p className="text-ink-muted mb-8">Privacy-preserving collaboration across regulated industries.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {USE_CASES.map(([title, body]) => (
            <div key={title} className="card-surface p-5">
              <h3 className="text-base font-semibold text-ink mb-2">{title}</h3>
              <p className="text-sm text-ink-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-ink mb-3">See it compute, live.</h2>
          <p className="text-ink-muted mb-8 max-w-2xl mx-auto">
            Register a dataset on-chain, run a secure aggregation across three nodes, and watch the
            fee settle under the protocol&apos;s split — in a single click.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-brand-primary text-surface-base font-semibold hover:bg-teal-300 hover:shadow-glow transition-all"
          >
            Open the Secure Computation Terminal →
          </Link>
        </div>
      </section>
    </div>
  );
}
