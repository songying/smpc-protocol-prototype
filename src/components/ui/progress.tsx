import React from 'react'

interface ProgressProps {
  value: number
  max?: number
  className?: string
}

export function Progress({ value, max = 100, className = '' }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={`relative w-full h-2 overflow-hidden rounded-full bg-surface-inset border border-line ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
