'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'

interface Algorithm {
  id: string
  name: string
  description: string
  computation_type: 'third_party' | 'zk' | 'fhe'
  version: string
  status: 'pending' | 'approved' | 'rejected' | 'under_review'
  user_address: string
  created_at: string
  updated_at: string
}

interface AlgorithmListProps {
  userAddress?: string
  status?: string
  showAll?: boolean
  onAlgorithmSelect?: (algorithm: Algorithm) => void
}

export default function AlgorithmList({ 
  userAddress, 
  status, 
  showAll = false,
  onAlgorithmSelect 
}: AlgorithmListProps) {
  const { address, isConnected } = useAccount()
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState({
    computationType: '',
    status: status || '',
    search: ''
  })

  const loadAlgorithms = useCallback(async () => {
    if (!isConnected) {
      setAlgorithms([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (userAddress) params.append('user', userAddress)
      if (status) params.append('status', status)

      const response = await fetch(`/api/algorithms?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load algorithms')
      }

      setAlgorithms(result.algorithms || [])
    } catch (error) {
      console.error('Error loading algorithms:', error)
      setError(error instanceof Error ? error.message : 'Failed to load algorithms')
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, userAddress, status])

  useEffect(() => {
    loadAlgorithms()
  }, [loadAlgorithms])

  const filteredAlgorithms = algorithms.filter(algorithm => {
    const matchesSearch = !filter.search || 
      algorithm.name.toLowerCase().includes(filter.search.toLowerCase()) ||
      algorithm.description.toLowerCase().includes(filter.search.toLowerCase())
    
    const matchesComputationType = !filter.computationType || 
      algorithm.computation_type === filter.computationType
    
    const matchesStatus = !filter.status || 
      algorithm.status === filter.status

    return matchesSearch && matchesComputationType && matchesStatus
  })

  const getStatusColor = (status: Algorithm['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'under_review':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
    }
  }

  const getComputationTypeColor = (type: Algorithm['computation_type']) => {
    switch (type) {
      case 'zk':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
      case 'fhe':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300'
      case 'third_party':
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const formatComputationType = (type: Algorithm['computation_type']) => {
    switch (type) {
      case 'third_party': return 'Third Party'
      case 'zk': return 'Zero Knowledge'
      case 'fhe': return 'FHE'
      default: return type
    }
  }

  if (!isConnected) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Please connect your wallet to view algorithms
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {userAddress && userAddress !== address ? 'User Algorithms' : 'My Algorithms'}
        </h2>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-0">
            <input
              type="text"
              placeholder="Search algorithms..."
              value={filter.search}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Computation Type Filter */}
          <div>
            <select
              value={filter.computationType}
              onChange={(e) => setFilter(prev => ({ ...prev, computationType: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Types</option>
              <option value="third_party">Third Party</option>
              <option value="zk">Zero Knowledge</option>
              <option value="fhe">FHE</option>
            </select>
          </div>

          {/* Status Filter */}
          {!status && (
            <div>
              <select
                value={filter.status}
                onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Loading algorithms...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-red-800 dark:text-red-300">{error}</p>
              <button
                onClick={loadAlgorithms}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
              >
                Try again
              </button>
            </div>
          </div>
        ) : filteredAlgorithms.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">
              {algorithms.length === 0 ? 'No algorithms found' : 'No algorithms match your filters'}
            </p>
            {algorithms.length === 0 && !userAddress && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Upload your first algorithm to get started
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAlgorithms.map((algorithm) => (
              <div
                key={algorithm.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onAlgorithmSelect?.(algorithm)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                      {algorithm.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {algorithm.description}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(algorithm.status)}`}>
                        {algorithm.status.replace('_', ' ')}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getComputationTypeColor(algorithm.computation_type)}`}>
                        {formatComputationType(algorithm.computation_type)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        v{algorithm.version}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500 dark:text-gray-400 ml-4">
                    <p>Created</p>
                    <p>{new Date(algorithm.created_at).toLocaleDateString()}</p>
                    {algorithm.updated_at !== algorithm.created_at && (
                      <>
                        <p className="mt-1">Updated</p>
                        <p>{new Date(algorithm.updated_at).toLocaleDateString()}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results Summary */}
      {!isLoading && !error && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredAlgorithms.length} of {algorithms.length} algorithms
          </p>
        </div>
      )}
    </div>
  )
}