import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  children,
  className = '',
  variant = 'default',
  size = 'md',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base disabled:opacity-50 disabled:cursor-not-allowed'

  const variantClasses = {
    default:
      'bg-brand-primary text-surface-base hover:bg-teal-300 hover:shadow-glow font-semibold',
    outline:
      'border border-line-strong bg-transparent text-ink hover:bg-surface-inset hover:border-brand-primary/50',
    ghost: 'bg-transparent text-ink-muted hover:bg-surface-inset hover:text-ink',
    danger: 'bg-brand-danger text-surface-base hover:bg-rose-300 font-semibold',
  }

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
