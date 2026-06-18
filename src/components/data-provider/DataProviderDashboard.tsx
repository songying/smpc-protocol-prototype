'use client'

import React, { useState } from 'react'
import { useAccount } from 'wagmi'
import { EnhancedDataUploadForm } from './EnhancedDataUploadForm'
import { DataCatalog } from './DataCatalog'
import { RevenueTrackingDashboard } from './RevenueTrackingDashboard'
import { PrivacyComplianceManager } from './PrivacyComplianceManager'

interface DataProviderDashboardProps {
  className?: string
}

type ViewMode = 'dashboard' | 'upload' | 'catalog' | 'revenue' | 'compliance'

export function DataProviderDashboard({ className = '' }: DataProviderDashboardProps) {
  const { address, isConnected } = useAccount()
  const [activeView, setActiveView] = useState<ViewMode>('dashboard')

  // Dashboard data (extracted from widget configuration)
  const dashboardStats = [
    {
      title: 'Total Revenue',
      value: '12.45 ETH',
      change: { value: 12.5, type: 'increase', period: 'vs last month' },
      color: 'green',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    },
    {
      title: 'Active Datasets',
      value: 24,
      change: { value: 3, type: 'increase', period: 'new this week' },
      color: 'blue',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      title: 'Download Count',
      value: 156,
      change: { value: 8.2, type: 'increase', period: 'this month' },
      color: 'purple',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )
    },
    {
      title: 'Compliance Score',
      value: '95%',
      change: { value: 2.1, type: 'increase', period: 'improvement' },
      color: 'cyan',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ]

  const revenueChartData = [
    { label: 'Jan', value: 2.1, color: '#3B82F6' },
    { label: 'Feb', value: 3.2, color: '#10B981' },
    { label: 'Mar', value: 2.8, color: '#F59E0B' },
    { label: 'Apr', value: 4.1, color: '#EF4444' },
    { label: 'May', value: 3.9, color: '#8B5CF6' },
    { label: 'Jun', value: 4.5, color: '#06B6D4' }
  ]

  const recentActivities = [
    {
      id: '1',
      title: 'Dataset "Customer Survey Q4" purchased',
      subtitle: 'By: 0x742d35Cc...789 • 0.5 ETH',
      status: 'completed',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    },
    {
      id: '2',
      title: 'New SMPC computation request',
      subtitle: 'Dataset: Financial Records • Pending approval',
      status: 'pending',
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      id: '3',
      title: 'Privacy compliance check completed',
      subtitle: 'All datasets passed GDPR validation',
      status: 'completed',
      timestamp: new Date(Date.now() - 1000 * 60 * 120),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: '4',
      title: 'Dataset performance analytics updated',
      subtitle: 'Healthcare data showing strong demand',
      status: 'completed',
      timestamp: new Date(Date.now() - 1000 * 60 * 180),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: '5',
      title: 'Monthly payout processed',
      subtitle: 'Revenue distribution completed',
      status: 'completed',
      timestamp: new Date(Date.now() - 1000 * 60 * 300),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    }
  ]

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
      description: 'Overview and analytics'
    },
    {
      id: 'upload',
      label: 'Upload Data',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      description: 'Upload and register new datasets'
    },
    {
      id: 'catalog',
      label: 'My Data',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      description: 'Manage your datasets'
    },
    {
      id: 'revenue',
      label: 'Revenue',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      description: 'Track earnings and payments'
    },
    {
      id: 'compliance',
      label: 'Compliance',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: 'Privacy and regulatory compliance'
    }
  ]

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please connect your wallet to access the Data Provider Dashboard
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`data-provider-dashboard space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data Provider Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your datasets, track revenue, and ensure compliance
            </p>
          </div>
          
          {/* User Info */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Data Provider</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">DP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-2">
        <nav className="flex space-x-1">
          {navigationItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as ViewMode)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeView === item.id
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
              title={item.description}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="min-h-[600px]">
        {activeView === 'dashboard' && (
          <div className="space-y-6">
            {/* Two Column Layout: Main content on left, Recent Activities on right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Content (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Revenue Overview */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue Overview</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {dashboardStats.map((stat, index) => {
                      const getColorClasses = (color: string) => {
                        const colorMap: Record<string, string> = {
                          blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400',
                          green: 'text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-400',
                          red: 'text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-400',
                          yellow: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-400',
                          purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/50 dark:text-purple-400',
                          cyan: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/50 dark:text-cyan-400'
                        }
                        return colorMap[color] || colorMap.blue
                      }
                      
                      const getChangeColor = (type: string) => {
                        switch (type) {
                          case 'increase': return 'text-green-600 dark:text-green-400'
                          case 'decrease': return 'text-red-600 dark:text-red-400'
                          default: return 'text-gray-500 dark:text-gray-400'
                        }
                      }
                      
                      return (
                        <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                {stat.title}
                              </h4>
                              <p className="text-xl font-bold text-gray-900 dark:text-white mt-2">
                                {stat.value}
                              </p>
                              
                              {stat.change && (
                                <div className={`flex items-center space-x-1 text-xs mt-1 ${getChangeColor(stat.change.type)}`}>
                                  <svg className={`w-4 h-4 ${stat.change.type === 'increase' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                                  </svg>
                                  <span>{stat.change.value}%</span>
                                  <span className="text-gray-500 dark:text-gray-400">{stat.change.period}</span>
                                </div>
                              )}
                            </div>
                            
                            {stat.icon && (
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getColorClasses(stat.color)}`}>
                                {React.cloneElement(stat.icon as React.ReactElement, { className: 'w-4 h-4' })}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Revenue Trend Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue Trend (ETH)</h3>
                  <div className="h-64">
                    <div className="h-full flex items-end justify-between space-x-2 px-2">
                      {revenueChartData.map((point, index) => {
                        const maxValue = Math.max(...revenueChartData.map(d => d.value))
                        return (
                          <div key={index} className="flex flex-col items-center space-y-2 flex-1 group">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                              {point.value} ETH
                            </div>
                            
                            <div 
                              className="bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative w-full"
                              style={{
                                height: `${(point.value / maxValue) * 100}%`,
                                backgroundColor: point.color,
                                minHeight: '4px'
                              }}
                              title={`${point.label}: ${point.value} ETH`}
                            >
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                {point.value} ETH
                              </div>
                            </div>
                            
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {point.label}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Recent Activities (1/3 width) */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Activities</h3>
                  <div className="space-y-4">
                    {recentActivities.map((item) => {
                      const getStatusClasses = (status?: string) => {
                        switch (status) {
                          case 'completed':
                            return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                          case 'active':
                            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                          case 'pending':
                            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                          case 'failed':
                            return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                          default:
                            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }
                      }
                      
                      const formatTimestamp = (timestamp?: Date) => {
                        if (!timestamp) return ''
                        const now = new Date()
                        const diff = now.getTime() - timestamp.getTime()
                        const minutes = Math.floor(diff / (1000 * 60))
                        const hours = Math.floor(minutes / 60)
                        
                        if (minutes < 1) return 'Just now'
                        if (minutes < 60) return `${minutes}m ago`
                        if (hours < 24) return `${hours}h ago`
                        return timestamp.toLocaleDateString()
                      }
                      
                      return (
                        <div key={item.id} className="group bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <div className="flex items-start space-x-3">
                            {item.icon && (
                              <div className="flex-shrink-0 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                <div className="text-gray-600 dark:text-gray-400">
                                  {item.icon}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {item.title}
                              </h5>
                              {item.subtitle && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {item.subtitle}
                                </p>
                              )}
                              
                              <div className="flex items-center justify-between mt-2">
                                {item.status && (
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClasses(item.status)}`}>
                                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                  </span>
                                )}
                                
                                {item.timestamp && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {formatTimestamp(item.timestamp)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'upload' && (
          <EnhancedDataUploadForm
            onSuccess={() => {
              setActiveView('catalog')
              console.log('Upload successful, redirecting to catalog')
            }}
            maxFiles={10}
            maxFileSize={100} // 100MB
          />
        )}

        {activeView === 'catalog' && (
          <DataCatalog
            onDatasetSelect={(dataset) => console.log('Dataset selected:', dataset)}
            onDatasetEdit={(dataset) => console.log('Edit dataset:', dataset)}
            onDatasetDelete={(id) => console.log('Delete dataset:', id)}
          />
        )}

        {activeView === 'revenue' && (
          <RevenueTrackingDashboard />
        )}

        {activeView === 'compliance' && (
          <PrivacyComplianceManager />
        )}
      </div>

    </div>
  )
}