import React from 'react'

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export function ScrollArea({ children, className = '', ...props }: ScrollAreaProps) {
  return (
    <div 
      className={`overflow-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}