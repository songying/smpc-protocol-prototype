'use client'

import React, { useState, useEffect } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { MobileDrawer, TouchButton, useIsMobile } from './MobileUtils'

interface NavigationItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
  role?: 'data_provider' | 'auditor' | 'data_consumer' | 'admin'
  badge?: number
}

interface MobileNavigationProps {
  currentRole: 'data_provider' | 'auditor' | 'data_consumer' | 'admin'
  currentPath: string
  onNavigate: (path: string) => void
  notifications?: number
}

export function MobileNavigation({
  currentRole,
  currentPath,
  onNavigate,
  notifications = 0
}: MobileNavigationProps) {
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const isMobile = useIsMobile()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const navigationItems: NavigationItem[] = [
    // Common items
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
      ),
      path: '/dashboard'
    },
    
    // Data Provider items
    ...(currentRole === 'data_provider' ? [
      {
        id: 'data-upload',
        label: 'Upload Data',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        ),
        path: '/data/upload',
        role: 'data_provider'
      },
      {
        id: 'data-catalog',
        label: 'My Data',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        ),
        path: '/data/catalog',
        role: 'data_provider'
      },
      {
        id: 'revenue',
        label: 'Revenue',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        ),
        path: '/revenue',
        role: 'data_provider'
      }
    ] : []),
    
    // Auditor items
    ...(currentRole === 'auditor' ? [
      {
        id: 'audit-queue',
        label: 'Audit Queue',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
        path: '/audit/queue',
        role: 'auditor'
      },
      {
        id: 'compliance',
        label: 'Compliance',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
        path: '/audit/compliance',
        role: 'auditor'
      },
      {
        id: 'audit-trail',
        label: 'Audit Trail',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
        path: '/audit/trail',
        role: 'auditor'
      }
    ] : []),
    
    // Data Consumer items
    ...(currentRole === 'data_consumer' ? [
      {
        id: 'data-discovery',
        label: 'Discover Data',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        ),
        path: '/data/discovery',
        role: 'data_consumer'
      },
      {
        id: 'computation-requests',
        label: 'My Requests',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        ),
        path: '/requests',
        role: 'data_consumer'
      },
      {
        id: 'results',
        label: 'Results',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        path: '/results',
        role: 'data_consumer'
      }
    ] : []),

    // System monitoring (for all roles)
    {
      id: 'monitoring',
      label: 'System Health',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      path: '/monitoring'
    }
  ]

  const handleNavigate = (path: string) => {
    onNavigate(path)
    setIsDrawerOpen(false)
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (!isMobile) {
    return null // Use desktop navigation for larger screens
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-30 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <TouchButton
            onClick={() => setIsDrawerOpen(true)}
            variant="secondary"
            size="sm"
            className="p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </TouchButton>

          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              SMPC Protocol
            </h1>
            <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
              {currentRole.replace('_', ' ').toUpperCase()}
            </div>
          </div>

          {/* Notifications */}
          <div className="relative">
            <TouchButton
              onClick={() => handleNavigate('/notifications')}
              variant="secondary"
              size="sm"
              className="p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5V17zm0 0l-5-5H5l5 5v-5z" />
              </svg>
            </TouchButton>
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notifications > 99 ? '99+' : notifications}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        side="left"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {currentRole.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {currentRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                {address && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatAddress(address)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 py-4">
            <nav className="px-2 space-y-1">
              {navigationItems.map((item) => (
                <TouchButton
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  variant={currentPath === item.path ? 'primary' : 'secondary'}
                  size="md"
                  className={`w-full justify-start space-x-3 ${
                    currentPath === item.path 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {item.icon}
                  </div>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </TouchButton>
              ))}
            </nav>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-2">
              <TouchButton
                onClick={() => handleNavigate('/settings')}
                variant="secondary"
                size="md"
                className="w-full justify-start space-x-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </TouchButton>

              <TouchButton
                onClick={() => disconnect()}
                variant="danger"
                size="md"
                className="w-full justify-start space-x-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Disconnect</span>
              </TouchButton>
            </div>
          </div>
        </div>
      </MobileDrawer>

      {/* Spacer for fixed header */}
      <div className="h-16 lg:hidden" />
    </>
  )
}