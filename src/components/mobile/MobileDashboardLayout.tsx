'use client'

import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { MobileNavigation } from './MobileNavigation'
import { PWAInstaller, PWAUpdater } from './PWAInstaller'
import { MobileTabBar, useIsMobile, useViewport, PullToRefresh } from './MobileUtils'
import { ConnectionStatusIndicator } from '../realtime/WebSocketManager'

interface MobileDashboardLayoutProps {
  children: React.ReactNode
  currentRole: 'data_provider' | 'auditor' | 'data_consumer' | 'admin'
  currentPath: string
  onNavigate: (path: string) => void
  onRefresh?: () => Promise<void>
  notifications?: number
}

export function MobileDashboardLayout({
  children,
  currentRole,
  currentPath,
  onNavigate,
  onRefresh,
  notifications = 0
}: MobileDashboardLayoutProps) {
  const { address, isConnected } = useAccount()
  const isMobile = useIsMobile()
  const viewport = useViewport()
  const [activeTab, setActiveTab] = useState('dashboard')

  // Update active tab based on current path
  useEffect(() => {
    const pathToTab: Record<string, string> = {
      '/dashboard': 'dashboard',
      '/data/upload': 'upload',
      '/data/catalog': 'catalog',
      '/data/discovery': 'discovery',
      '/requests': 'requests',
      '/results': 'results',
      '/audit/queue': 'audit',
      '/audit/compliance': 'compliance',
      '/monitoring': 'monitoring',
      '/notifications': 'notifications',
      '/settings': 'settings'
    }

    const tab = pathToTab[currentPath] || 'dashboard'
    setActiveTab(tab)
  }, [currentPath])

  // Define tab configurations for different roles
  const getTabsForRole = () => {
    const commonTabs = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
        )
      },
      {
        id: 'monitoring',
        label: 'Health',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" />
          </svg>
        )
      },
      {
        id: 'notifications',
        label: 'Alerts',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5V17z" />
          </svg>
        ),
        badge: notifications
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
        )
      }
    ]

    switch (currentRole) {
      case 'data_provider':
        return [
          commonTabs[0], // dashboard
          {
            id: 'upload',
            label: 'Upload',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )
          },
          {
            id: 'catalog',
            label: 'My Data',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            )
          },
          commonTabs[1], // monitoring
          commonTabs[3]  // settings
        ]

      case 'auditor':
        return [
          commonTabs[0], // dashboard
          {
            id: 'audit',
            label: 'Audits',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            )
          },
          {
            id: 'compliance',
            label: 'Compliance',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            )
          },
          commonTabs[1], // monitoring
          commonTabs[3]  // settings
        ]

      case 'data_consumer':
        return [
          commonTabs[0], // dashboard
          {
            id: 'discovery',
            label: 'Discover',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )
          },
          {
            id: 'requests',
            label: 'Requests',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            )
          },
          {
            id: 'results',
            label: 'Results',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )
          }
        ]

      default:
        return commonTabs
    }
  }

  const tabs = getTabsForRole()

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    
    const tabToPaths: Record<string, string> = {
      dashboard: '/dashboard',
      upload: '/data/upload',
      catalog: '/data/catalog',
      discovery: '/data/discovery',
      requests: '/requests',
      results: '/results',
      audit: '/audit/queue',
      compliance: '/audit/compliance',
      monitoring: '/monitoring',
      notifications: '/notifications',
      settings: '/settings'
    }
    
    const path = tabToPaths[tabId] || '/dashboard'
    onNavigate(path)
  }

  // Handle default refresh
  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh()
    } else {
      // Default refresh action
      window.location.reload()
    }
  }

  if (!isMobile) {
    // Return desktop layout
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PWAUpdater />
        {children}
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16 lg:pb-0"
      style={{ 
        minHeight: viewport.height ? `${viewport.height}px` : '100vh',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {/* PWA Components */}
      <PWAInstaller />
      <PWAUpdater />

      {/* Mobile Navigation Header */}
      <MobileNavigation
        currentRole={currentRole}
        currentPath={currentPath}
        onNavigate={onNavigate}
        notifications={notifications}
      />

      {/* Status Bar */}
      {isConnected && (
        <div className="fixed top-16 right-4 z-20 lg:hidden">
          <ConnectionStatusIndicator />
        </div>
      )}

      {/* Main Content with Pull-to-Refresh */}
      <div className="flex-1 overflow-hidden">
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="min-h-full p-4 pt-6">
            {/* Connection Status Warning */}
            {!isConnected && (
              <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Wallet Not Connected
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Connect your wallet to access full functionality
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Role Indicator */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {currentRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Mode
                </span>
              </div>
              
              {viewport.orientation === 'landscape' && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Landscape Mode
                </div>
              )}
            </div>

            {/* Page Content */}
            <div className="space-y-6">
              {children}
            </div>
          </div>
        </PullToRefresh>
      </div>

      {/* Mobile Tab Bar */}
      <MobileTabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Safe area padding for devices with home indicator */}
      <style jsx global>{`
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        .pt-safe {
          padding-top: env(safe-area-inset-top);
        }
        
        .pl-safe {
          padding-left: env(safe-area-inset-left);
        }
        
        .pr-safe {
          padding-right: env(safe-area-inset-right);
        }
        
        /* Prevent zoom on input focus for iOS */
        @media screen and (max-width: 768px) {
          input[type="text"],
          input[type="email"],
          input[type="number"],
          input[type="tel"],
          input[type="url"],
          input[type="password"],
          input[type="search"],
          textarea,
          select {
            font-size: 16px !important;
          }
        }
        
        /* Custom scrollbar for mobile */
        @media (max-width: 768px) {
          ::-webkit-scrollbar {
            width: 4px;
          }
          
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          
          ::-webkit-scrollbar-thumb {
            background: rgba(156, 163, 175, 0.5);
            border-radius: 2px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(156, 163, 175, 0.7);
          }
        }
        
        /* Hide scrollbar for touch devices */
        @media (pointer: coarse) {
          * {
            scrollbar-width: thin;
            scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
          }
        }
      `}</style>
    </div>
  )
}