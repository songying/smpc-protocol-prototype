import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
}

export function Badge({ children, className = '', variant = 'default', ...props }: BadgeProps) {
  const baseClasses =
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border'

  const variantClasses = {
    default: 'bg-brand-secondary/15 text-blue-300 border-brand-secondary/30',
    secondary: 'bg-surface-inset text-ink-muted border-line-strong',
    destructive: 'bg-brand-danger/15 text-rose-300 border-brand-danger/30',
    outline: 'bg-transparent text-ink-muted border-line-strong',
    success: 'bg-brand-success/15 text-emerald-300 border-brand-success/30',
    warning: 'bg-brand-warn/15 text-amber-300 border-brand-warn/30',
  }

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </span>
  )
}
