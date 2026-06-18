'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAccount } from 'wagmi'

interface ComputationRequest {
  id: string
  title: string
  description: string
  datasets: DatasetInfo[]
  computationType: 'statistical' | 'ml' | 'analytics' | 'custom'
  status: 'pending' | 'approved' | 'computing' | 'completed' | 'failed' | 'cancelled'
  submittedAt: Date
  startedAt?: Date
  completedAt?: Date
  estimatedDuration: string
  actualDuration?: string
  progress: number
  cost: {
    estimated: number
    actual?: number
    currency: 'ETH'
  }
  approvals: {
    required: number
    received: number
    auditors: string[]
  }
  participants: string[]
  resultAvailable: boolean
  resultHash?: string
  errorMessage?: string
}

interface DatasetInfo {
  id: string
  title: string
  provider: string
  size: number
  accessGranted: boolean
}

interface RequestManagementProps {
  onViewResults?: (requestId: string) => void
  onCancelRequest?: (requestId: string) => void
  onRetryRequest?: (requestId: string) => void
}

export function RequestManagementDashboard({ 
  onViewResults, 
  onCancelRequest, 
  onRetryRequest 
}: RequestManagementProps) {
  const { address } = useAccount()
  
  // Mock data - in real app this would come from API/blockchain
  const [requests] = useState<ComputationRequest[]>([
    {
      id: 'req_001',
      title: 'E-commerce Customer Analysis',
      description: 'Statistical analysis of customer behavior patterns across multiple e-commerce platforms',
      datasets: [
        {
          id: 'ds_001',
          title: 'E-commerce Customer Behavior Dataset',
          provider: 'DataMart Analytics',
          size: 15728640,
          accessGranted: true
        },
        {
          id: 'ds_002',
          title: 'Customer Purchase History',
          provider: 'RetailData Co',
          size: 8388608,
          accessGranted: true
        }
      ],
      computationType: 'statistical',
      status: 'computing',
      submittedAt: new Date('2024-01-20T10:30:00'),
      startedAt: new Date('2024-01-20T11:15:00'),
      estimatedDuration: '15-20 minutes',
      progress: 75,
      cost: {
        estimated: 1.25,
        actual: 1.18,
        currency: 'ETH'
      },
      approvals: {
        required: 2,
        received: 2,
        auditors: ['0x742d35Cc...789', '0x123456...456']
      },
      participants: ['0xDataProvider1', '0xDataProvider2'],
      resultAvailable: false
    },
    {
      id: 'req_002',
      title: 'Medical Research Correlation Study',
      description: 'Privacy-preserving correlation analysis for cardiovascular disease research',
      datasets: [
        {
          id: 'ds_003',
          title: 'Cardiovascular Studies Dataset',
          provider: 'MedData Research',
          size: 52428800,
          accessGranted: true
        }
      ],
      computationType: 'ml',
      status: 'completed',
      submittedAt: new Date('2024-01-18T14:20:00'),
      startedAt: new Date('2024-01-18T15:00:00'),
      completedAt: new Date('2024-01-18T15:45:00'),
      estimatedDuration: '30-45 minutes',
      actualDuration: '45 minutes',
      progress: 100,
      cost: {
        estimated: 2.5,
        actual: 2.38,
        currency: 'ETH'
      },
      approvals: {
        required: 3,
        received: 3,
        auditors: ['0x742d35Cc...789', '0x123456...456', '0x987654...321']
      },
      participants: ['0xMedDataProvider'],
      resultAvailable: true,
      resultHash: '0xabcd1234567890...'
    },
    {
      id: 'req_003',
      title: 'Financial Market Analysis',
      description: 'Federated learning model for cryptocurrency trading patterns',
      datasets: [
        {
          id: 'ds_004',
          title: 'Crypto Trading Dataset',
          provider: 'CryptoInsights',
          size: 31457280,
          accessGranted: false
        }
      ],
      computationType: 'analytics',
      status: 'pending',
      submittedAt: new Date('2024-01-21T09:15:00'),
      estimatedDuration: '60-90 minutes',
      progress: 0,
      cost: {
        estimated: 1.8,
        currency: 'ETH'
      },
      approvals: {
        required: 2,
        received: 1,
        auditors: ['0x742d35Cc...789']
      },
      participants: ['0xCryptoProvider'],
      resultAvailable: false
    }
  ])

  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [sortBy, setSortBy] = useState('submittedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedRequest, setSelectedRequest] = useState<ComputationRequest | null>(null)

  // Filter and sort requests
  const filteredAndSortedRequests = useMemo(() => {
    let filtered = requests.filter(request => {
      if (selectedStatus !== 'all' && request.status !== selectedStatus) {
        return false
      }
      if (selectedType !== 'all' && request.computationType !== selectedType) {
        return false
      }
      return true
    })

    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof ComputationRequest]
      let bValue: any = b[sortBy as keyof ComputationRequest]

      if (sortBy === 'submittedAt' || sortBy === 'completedAt') {
        aValue = new Date(aValue || 0).getTime()
        bValue = new Date(bValue || 0).getTime()
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [requests, selectedStatus, selectedType, sortBy, sortOrder])

  const getStatusColor = (status: ComputationRequest['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
      case 'computing': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status: ComputationRequest['status']) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'approved':
        return (
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'computing':
        return (
          <svg className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'cancelled':
        return (
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
          </svg>
        )
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getTypeIcon = (type: ComputationRequest['computationType']) => {
    switch (type) {
      case 'statistical': return '📊'
      case 'ml': return '🤖'
      case 'analytics': return '📈'
      case 'custom': return '⚙️'
    }
  }

  const RequestCard = ({ request }: { request: ComputationRequest }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">{getTypeIcon(request.computationType)}</span>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {request.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {request.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {getStatusIcon(request.status)}
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        {request.status === 'computing' && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span>Progress</span>
              <span>{request.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${request.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Datasets */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Datasets ({request.datasets.length})
          </h4>
          <div className="space-y-2">
            {request.datasets.map(dataset => (
              <div key={dataset.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{dataset.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    by {dataset.provider} • {formatFileSize(dataset.size)}
                  </p>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  dataset.accessGranted ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
              </div>
            ))}
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Submitted:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatDate(request.submittedAt)}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Duration:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {request.actualDuration || request.estimatedDuration}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Cost:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {request.cost.actual ? request.cost.actual.toFixed(4) : request.cost.estimated.toFixed(4)} {request.cost.currency}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Approvals:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {request.approvals.received}/{request.approvals.required}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedRequest(request)}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View Details
          </button>
          
          <div className="flex items-center space-x-2">
            {request.status === 'completed' && request.resultAvailable && (
              <button
                onClick={() => onViewResults?.(request.id)}
                className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded"
              >
                View Results
              </button>
            )}
            
            {request.status === 'failed' && (
              <button
                onClick={() => onRetryRequest?.(request.id)}
                className="px-3 py-1 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded"
              >
                Retry
              </button>
            )}
            
            {(request.status === 'pending' || request.status === 'approved') && (
              <button
                onClick={() => onCancelRequest?.(request.id)}
                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Computation Requests</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage your {requests.length} computation requests
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {requests.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Computing</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {requests.filter(r => r.status === 'computing').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {requests.filter(r => r.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {requests.reduce((sum, r) => sum + (r.cost.actual || r.cost.estimated), 0).toFixed(2)} ETH
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="computing">Computing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="statistical">Statistical</option>
            <option value="ml">Machine Learning</option>
            <option value="analytics">Analytics</option>
            <option value="custom">Custom</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="submittedAt">Submitted Date</option>
            <option value="status">Status</option>
            <option value="progress">Progress</option>
            <option value="cost.estimated">Cost</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredAndSortedRequests.length} of {requests.length} requests
          </p>
        </div>

        {filteredAndSortedRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No requests found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters or submit a new computation request.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAndSortedRequests.map(request => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </div>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedRequest.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Request ID: {selectedRequest.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Status and Progress */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Status & Progress</h4>
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(selectedRequest.status)}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedRequest.status)}`}>
                      {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                    </span>
                    {selectedRequest.status === 'computing' && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedRequest.progress}% complete
                      </span>
                    )}
                  </div>
                  
                  {selectedRequest.status === 'computing' && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${selectedRequest.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Timeline</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Submitted:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(selectedRequest.submittedAt)}
                      </span>
                    </div>
                    {selectedRequest.startedAt && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Started:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDate(selectedRequest.startedAt)}
                        </span>
                      </div>
                    )}
                    {selectedRequest.completedAt && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Completed:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDate(selectedRequest.completedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Error Message */}
                {selectedRequest.errorMessage && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Error Details</h4>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <p className="text-red-700 dark:text-red-400 text-sm">{selectedRequest.errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {selectedRequest.status === 'completed' && selectedRequest.resultAvailable && (
                    <button
                      onClick={() => onViewResults?.(selectedRequest.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                    >
                      View Results
                    </button>
                  )}
                  
                  {selectedRequest.status === 'failed' && (
                    <button
                      onClick={() => onRetryRequest?.(selectedRequest.id)}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                    >
                      Retry Request
                    </button>
                  )}
                  
                  {(selectedRequest.status === 'pending' || selectedRequest.status === 'approved') && (
                    <button
                      onClick={() => onCancelRequest?.(selectedRequest.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}