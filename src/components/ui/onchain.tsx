'use client'

import React from 'react'
import { publicConfig } from '@/lib/config'

/** A monospace transaction-hash chip, linked to the explorer when configured. */
export function TxChip({ hash, label = 'tx' }: { hash?: string; label?: string }) {
  if (!hash) return null
  const short = `${hash.slice(0, 10)}…${hash.slice(-6)}`
  const inner = (
    <span className="chip chip-mono">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" />
      </svg>
      <span className="text-ink-muted">{label}</span>
      <span className="text-brand-secondary">{short}</span>
    </span>
  )
  if (publicConfig.explorerBase) {
    return (
      <a href={`${publicConfig.explorerBase}/tx/${hash}`} target="_blank" rel="noreferrer" className="hover:opacity-80">
        {inner}
      </a>
    )
  }
  return inner
}

/** "Live" vs "Simulated" status indicator. */
export function LiveBadge({ live }: { live: boolean }) {
  return (
    <span className="chip">
      <span className={`status-dot ${live ? 'status-live' : 'status-sim'}`} />
      {live ? 'Live on-chain' : 'Simulated'}
    </span>
  )
}

export function SimulatedTag({ what = 'Simulated' }: { what?: string }) {
  return (
    <span className="chip">
      <span className="status-dot status-sim" />
      {what}
    </span>
  )
}
