'use client'

import React, { useState } from 'react'
import { useRole, UserRole } from '@/contexts/RoleContext'

export function RoleSwitcher() {
  const { currentRole, setCurrentRole, getRoleDisplayName, getRoleIcon } = useRole()
  const [isOpen, setIsOpen] = useState(false)

  const roles: UserRole[] = ['data-provider', 'data-consumer', 'auditor']

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role)
    setIsOpen(false)
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'data-provider':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'data-consumer':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'auditor':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleHoverColor = (role: UserRole) => {
    switch (role) {
      case 'data-provider':
        return 'hover:bg-blue-200'
      case 'data-consumer':
        return 'hover:bg-green-200'
      case 'auditor':
        return 'hover:bg-purple-200'
      default:
        return 'hover:bg-gray-200'
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center px-3 py-2 border rounded-full text-sm font-medium transition-colors ${getRoleColor(currentRole)} hover:opacity-80`}
      >
        <span className="mr-2">{getRoleIcon(currentRole)}</span>
        <span>{getRoleDisplayName(currentRole)}</span>
        <svg
          className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="py-1">
              <div className="px-3 py-2 text-sm font-semibold text-gray-900 border-b border-gray-100">
                Switch Role
              </div>
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    role === currentRole
                      ? `${getRoleColor(role)} font-medium`
                      : `text-gray-700 ${getRoleHoverColor(role)}`
                  }`}
                >
                  <div className="flex items-center">
                    <span className="mr-3 text-lg">{getRoleIcon(role)}</span>
                    <div>
                      <div className="font-medium">{getRoleDisplayName(role)}</div>
                      <div className="text-xs text-gray-500">
                        {role === 'data-provider' && 'Upload and monetize your datasets'}
                        {role === 'data-consumer' && 'Access and analyze encrypted data'}
                        {role === 'auditor' && 'Verify computations and compliance'}
                      </div>
                    </div>
                    {role === currentRole && (
                      <svg className="ml-auto h-4 w-4 text-current" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}