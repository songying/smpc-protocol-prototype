import React, { useState, createContext, useContext } from 'react'

interface TabsContextType {
  activeTab: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextType | null>(null)

interface TabsProps {
  children: React.ReactNode
  value: string
  onValueChange: (value: string) => void
  className?: string
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

interface TabsTriggerProps {
  children: React.ReactNode
  value: string
  className?: string
}

interface TabsContentProps {
  children: React.ReactNode
  value: string
  className?: string
}

export function Tabs({ children, value, onValueChange, className = '' }: TabsProps) {
  return (
    <TabsContext.Provider value={{ activeTab: value, onValueChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-lg bg-surface-inset border border-line p-1 text-ink-muted ${className}`}>
      {children}
    </div>
  )
}

export function TabsTrigger({ children, value, className = '' }: TabsTriggerProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')
  
  const { activeTab, onValueChange } = context
  const isActive = activeTab === value
  
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${
        isActive
          ? 'bg-surface-raised text-ink shadow-sm border border-line'
          : 'text-ink-muted hover:text-ink hover:bg-surface-raised/50'
      } ${className}`}
      onClick={() => onValueChange(value)}
    >
      {children}
    </button>
  )
}

export function TabsContent({ children, value, className = '' }: TabsContentProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')
  
  const { activeTab } = context
  
  if (activeTab !== value) return null
  
  return (
    <div className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}>
      {children}
    </div>
  )
}