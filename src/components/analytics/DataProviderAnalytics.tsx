'use client'

import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface ProviderAnalytics {
  provider: string
  timeRange: string
  summary: {
    totalDataSets: number
    algorithmsUsed: number
    totalComputations: number
    totalRevenue: number
  }
  algorithmUsage: Array<{
    algorithmId: string
    algorithmName: string
    computationType: 'third_party' | 'zk' | 'fhe'
    usageCount: number
    lastUsed: string
    revenue: number
  }>
  dataSetUsage: Array<{
    dataSetId: string
    dataSetName: string
    algorithmCount: number
    totalComputations: number
    revenue: number
  }>
  topAlgorithms: Array<{
    algorithmId: string
    algorithmName: string
    computationType: 'third_party' | 'zk' | 'fhe'
    usageCount: number
    revenue: number
  }>
  recentActivity: {
    newAlgorithms: number
    algorithms: Array<{
      id: string
      name: string
      computationType: 'third_party' | 'zk' | 'fhe'
      status: string
      createdAt: string
    }>
  }
}

interface UserAnalytics {
  user: string
  timeRange: string
  summary: {
    totalAlgorithms: number
    approvedAlgorithms: number
    pendingAlgorithms: number
    rejectedAlgorithms: number
    approvalRate: number
  }
  byComputationType: Record<string, number>
  recentActivity: {
    newAlgorithms: number
    algorithms: Array<{
      id: string
      name: string
      computationType: 'third_party' | 'zk' | 'fhe'
      status: string
      createdAt: string
    }>
  }
  auditStatistics: Array<{
    algorithmId: string
    algorithmName: string
    auditCount: number
    avgAuditTime: number
    lastAuditStatus: string
  }>
  usageStatistics: Array<{
    algorithmId: string
    algorithmName: string
    computationType: 'third_party' | 'zk' | 'fhe'
    totalExecutions: number
    totalDataProcessed: number
    avgExecutionTime: number
    successRate: number
  }>
}

export default function DataProviderAnalytics() {
  const { address, isConnected } = useAccount()
  const [analytics, setAnalytics] = useState<ProviderAnalytics | UserAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('30d')
  const [viewType, setViewType] = useState<'provider' | 'consumer'>('consumer')
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'usage' | 'performance'>('usage')

  useEffect(() => {
    if (isConnected && address) {
      loadAnalytics()
    }
  }, [isConnected, address, timeRange, viewType])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append('range', timeRange)
      
      if (viewType === 'provider') {
        params.append('user', address!)
      }

      const response = await fetch(`/api/analytics/algorithms?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load analytics')
      }

      setAnalytics(result)
    } catch (error) {
      console.error('Error loading analytics:', error)
      setError(error instanceof Error ? error.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatPercentage = (rate: number): string => {
    return `${Math.round(rate * 100)}%`
  }

  const getComputationTypeColor = (type: string) => {
    switch (type) {
      case 'zk':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
      case 'fhe':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300'
      case 'third_party':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const formatComputationType = (type: string) => {
    switch (type) {
      case 'third_party': return 'Third Party'
      case 'zk': return 'Zero Knowledge'
      case 'fhe': return 'FHE'
      default: return type
    }
  }

  const isProviderAnalytics = (data: any): data is ProviderAnalytics => {
    return data && 'provider' in data
  }

  if (!isConnected) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Please connect your wallet to view analytics
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Analytics Dashboard
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {viewType === 'provider' ? 'Data Provider' : 'Algorithm Consumer'} insights and metrics
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            {/* View Type Toggle */}
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
              <button
                onClick={() => setViewType('consumer')}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                  viewType === 'consumer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Consumer
              </button>
              <button
                onClick={() => setViewType('provider')}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                  viewType === 'provider'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Provider
              </button>
            </div>

            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={loadAnalytics}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-red-800 dark:text-red-300">{error}</p>
            <button
              onClick={loadAnalytics}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Analytics Content */}
      {!isLoading && !error && analytics && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {isProviderAnalytics(analytics) ? (
              // Provider Summary Cards
              <>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data Sets</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {formatNumber(analytics.summary.totalDataSets)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Algorithms Used</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {formatNumber(analytics.summary.algorithmsUsed)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/20">
                      <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Computations</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {formatNumber(analytics.summary.totalComputations)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                      <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Revenue</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(analytics.summary.totalRevenue)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // Consumer Summary Cards
              <>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Algorithms</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {formatNumber(analytics.summary.totalAlgorithms)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Approved</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {formatNumber(analytics.summary.approvedAlgorithms)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                      <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {formatNumber(analytics.summary.pendingAlgorithms)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/20">
                      <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Approval Rate</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {formatPercentage(analytics.summary.approvalRate)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Algorithm Usage / Performance */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {isProviderAnalytics(analytics) ? 'Top Algorithms on Your Data' : 'Algorithm Performance'}
              </h3>
              
              <div className="space-y-4">
                {isProviderAnalytics(analytics) ? (
                  analytics.topAlgorithms.slice(0, 5).map((algorithm) => (
                    <div key={algorithm.algorithmId} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {algorithm.algorithmName}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getComputationTypeColor(algorithm.computationType)}`}>
                            {formatComputationType(algorithm.computationType)}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {algorithm.usageCount} executions
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(algorithm.revenue)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  analytics.usageStatistics?.slice(0, 5).map((stat) => (
                    <div key={stat.algorithmId} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {stat.algorithmName}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getComputationTypeColor(stat.computationType)}`}>
                            {formatComputationType(stat.computationType)}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {stat.totalExecutions} executions
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-blue-600 dark:text-blue-400">
                          {formatPercentage(stat.successRate)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {stat.avgExecutionTime}ms avg
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Activity
              </h3>
              
              <div className="space-y-4">
                {analytics.recentActivity.algorithms.slice(0, 5).map((algorithm) => (
                  <div key={algorithm.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {algorithm.name}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getComputationTypeColor(algorithm.computationType)}`}>
                          {formatComputationType(algorithm.computationType)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {algorithm.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(algorithm.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Computation Types Distribution */}
          {!isProviderAnalytics(analytics) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Algorithms by Computation Type
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(analytics.byComputationType).map(([type, count]) => (
                  <div key={type} className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-2 ${getComputationTypeColor(type)}`}>
                      {formatComputationType(type)}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(count)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      algorithms
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}