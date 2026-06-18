'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

export type UserRole = 'data-provider' | 'data-consumer' | 'auditor'

interface RoleContextType {
  currentRole: UserRole
  setCurrentRole: (role: UserRole) => void
  getRoleDisplayName: (role: UserRole) => string
  getRoleIcon: (role: UserRole) => string
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function useRole() {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}

interface RoleProviderProps {
  children: ReactNode
}

export function RoleProvider({ children }: RoleProviderProps) {
  const [currentRole, setCurrentRole] = useState<UserRole>('data-provider')

  const getRoleDisplayName = (role: UserRole): string => {
    switch (role) {
      case 'data-provider':
        return 'Data Provider'
      case 'data-consumer':
        return 'Data Consumer'
      case 'auditor':
        return 'Auditor'
      default:
        return 'Unknown'
    }
  }

  const getRoleIcon = (role: UserRole): string => {
    switch (role) {
      case 'data-provider':
        return '📊' // Database/Chart icon
      case 'data-consumer':
        return '🔍' // Search/Analysis icon
      case 'auditor':
        return '🛡️' // Shield/Security icon
      default:
        return '👤'
    }
  }

  return (
    <RoleContext.Provider value={{
      currentRole,
      setCurrentRole,
      getRoleDisplayName,
      getRoleIcon
    }}>
      {children}
    </RoleContext.Provider>
  )
}