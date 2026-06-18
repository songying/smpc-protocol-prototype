'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface PendingRequest {
  id: string
  title: string
  description: string
  submitter: string
  submitterAddress: string
  submittedAt: Date
  deadline: Date
  priority: 'low' | 'medium' | 'high' | 'critical'
  computationType: 'statistical' | 'ml' | 'analytics' | 'custom'
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_changes'
  datasets: RequestDataset[]
  complianceFlags: ComplianceFlag[]
  riskScore: number
  estimatedCost: number
  requiredApprovals: number
  receivedApprovals: number
  assignedAuditors: string[]
  previousVersions?: string[]
  attachments: RequestAttachment[]
}

interface RequestDataset {
  id: string
  title: string
  provider: string
  category: number
  sensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted'
  complianceStatus: 'compliant' | 'warning' | 'non-compliant'
  size: number
  encryptionStatus: 'encrypted' | 'unencrypted' | 'partially-encrypted'
}

interface ComplianceFlag {
  id: string
  type: 'privacy' | 'security' | 'regulatory' | 'technical' | 'ethical'
  severity: 'info' | 'warning' | 'error' | 'critical'
  description: string
  autoDetected: boolean
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: Date
}

interface RequestAttachment {
  id: string
  name: string
  type: 'document' | 'code' | 'certificate' | 'approval'
  size: number
  uploadedAt: Date
  verified: boolean
}

interface AuditorAction {
  type: 'approve' | 'reject' | 'request_changes' | 'escalate'
  reason: string
  conditions?: string[]
  recommendations?: string[]
}

interface AuditorDashboardProps {
  onApproveRequest?: (requestId: string, action: AuditorAction) => void
  onRejectRequest?: (requestId: string, action: AuditorAction) => void
  onRequestChanges?: (requestId: string, action: AuditorAction) => void
  onEscalateRequest?: (requestId: string, action: AuditorAction) => void
}

const CATEGORIES = [
  'Personal', 'Financial', 'Health', 'Behavioral', 'Commercial', 'Other'
]

export function AuditorDashboard({
  onApproveRequest,
  onRejectRequest,
  onRequestChanges,
  onEscalateRequest
}: AuditorDashboardProps) {
  const { address } = useAccount()
  
  // Mock data - in real app this would come from API/blockchain
  const [requests] = useState<PendingRequest[]>([
    {
      id: 'req_audit_001',
      title: 'Medical AI Training Dataset Request',
      description: 'Request for access to cardiovascular disease dataset for federated learning model training. The model will be used for early detection of heart disease in clinical settings.',
      submitter: 'Dr. Sarah Chen',
      submitterAddress: '0x123456789abcdef',
      submittedAt: new Date('2024-01-20T09:30:00'),
      deadline: new Date('2024-01-22T17:00:00'),
      priority: 'high',
      computationType: 'ml',
      status: 'under_review',
      datasets: [
        {
          id: 'ds_med_001',
          title: 'Cardiovascular Studies Dataset',
          provider: 'MedData Research',
          category: 2, // Health
          sensitivityLevel: 'restricted',
          complianceStatus: 'compliant',
          size: 52428800,
          encryptionStatus: 'encrypted'
        }
      ],
      complianceFlags: [
        {
          id: 'flag_001',
          type: 'regulatory',
          severity: 'warning',
          description: 'Dataset contains PHI - requires HIPAA compliance verification',
          autoDetected: true,
          resolved: false
        },
        {
          id: 'flag_002',
          type: 'privacy',
          severity: 'info',
          description: 'High privacy score dataset - additional anonymization recommended',
          autoDetected: true,
          resolved: true,
          resolvedBy: 'system',
          resolvedAt: new Date('2024-01-20T10:15:00')
        }
      ],
      riskScore: 75,
      estimatedCost: 2.5,
      requiredApprovals: 3,
      receivedApprovals: 1,
      assignedAuditors: ['0x742d35Cc...789', '0x987654...321', address || ''],
      attachments: [
        {
          id: 'att_001',
          name: 'IRB_Approval_Certificate.pdf',
          type: 'certificate',
          size: 245760,
          uploadedAt: new Date('2024-01-20T09:35:00'),
          verified: true
        },
        {
          id: 'att_002',
          name: 'Data_Processing_Agreement.pdf',
          type: 'document',
          size: 524288,
          uploadedAt: new Date('2024-01-20T09:40:00'),
          verified: false
        }
      ]
    },
    {
      id: 'req_audit_002',
      title: 'E-commerce Customer Analytics Request',
      description: 'Statistical analysis of customer behavior patterns for market research. Results will be used to improve user experience and product recommendations.',
      submitter: 'Marketing Team Lead',
      submitterAddress: '0xabcdef123456789',
      submittedAt: new Date('2024-01-19T14:20:00'),
      deadline: new Date('2024-01-21T12:00:00'),
      priority: 'medium',
      computationType: 'statistical',
      status: 'pending',
      datasets: [
        {
          id: 'ds_ecom_001',
          title: 'E-commerce Customer Behavior',
          provider: 'DataMart Analytics',
          category: 4, // Commercial
          sensitivityLevel: 'internal',
          complianceStatus: 'compliant',
          size: 15728640,
          encryptionStatus: 'encrypted'
        }
      ],
      complianceFlags: [
        {
          id: 'flag_003',
          type: 'privacy',
          severity: 'info',
          description: 'Customer data requires consent verification',
          autoDetected: false,
          resolved: true,
          resolvedBy: 'submitter',
          resolvedAt: new Date('2024-01-19T15:30:00')
        }
      ],
      riskScore: 35,
      estimatedCost: 0.75,
      requiredApprovals: 2,
      receivedApprovals: 0,
      assignedAuditors: [address || '', '0x742d35Cc...789'],
      attachments: [
        {
          id: 'att_003',
          name: 'Customer_Consent_Forms.zip',
          type: 'document',
          size: 1048576,
          uploadedAt: new Date('2024-01-19T14:25:00'),
          verified: true
        }
      ]
    },
    {
      id: 'req_audit_003',
      title: 'Financial Trading Algorithm Validation',
      description: 'Request to validate trading algorithm performance using historical cryptocurrency data. Critical for production deployment.',
      submitter: 'Quant Research Team',
      submitterAddress: '0x987654321abcdef',
      submittedAt: new Date('2024-01-21T11:00:00'),
      deadline: new Date('2024-01-21T18:00:00'),
      priority: 'critical',
      computationType: 'analytics',
      status: 'requires_changes',
      datasets: [
        {
          id: 'ds_fin_001',
          title: 'Crypto Trading Patterns',
          provider: 'CryptoInsights',
          category: 1, // Financial
          sensitivityLevel: 'confidential',
          complianceStatus: 'warning',
          size: 31457280,
          encryptionStatus: 'encrypted'
        }
      ],
      complianceFlags: [
        {
          id: 'flag_004',
          type: 'security',
          severity: 'error',
          description: 'Algorithm code requires security audit before execution',
          autoDetected: true,
          resolved: false
        },
        {
          id: 'flag_005',
          type: 'regulatory',
          severity: 'critical',
          description: 'Financial data usage requires additional compliance documentation',
          autoDetected: false,
          resolved: false
        }
      ],
      riskScore: 89,
      estimatedCost: 1.8,
      requiredApprovals: 3,
      receivedApprovals: 0,
      assignedAuditors: [address || '', '0x123456...456', '0x789abc...def'],
      previousVersions: ['req_audit_003_v1'],
      attachments: [
        {
          id: 'att_004',
          name: 'trading_algorithm.py',
          type: 'code',
          size: 102400,
          uploadedAt: new Date('2024-01-21T11:05:00'),
          verified: false
        }
      ]
    }
  ])

  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [sortBy, setSortBy] = useState('deadline')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState<AuditorAction['type']>('approve')
  const [actionReason, setActionReason] = useState('')
  const [actionConditions, setActionConditions] = useState<string[]>([])
  const [actionRecommendations, setActionRecommendations] = useState<string[]>([])

  // Filter and sort requests
  const filteredAndSortedRequests = useMemo(() => {
    let filtered = requests.filter(request => {
      // Only show requests assigned to current auditor
      if (!request.assignedAuditors.includes(address || '')) {
        return false
      }

      // Filter by status
      if (selectedFilter !== 'all' && request.status !== selectedFilter) {
        return false
      }

      // Filter by priority
      if (selectedPriority !== 'all' && request.priority !== selectedPriority) {
        return false
      }

      return true
    })

    // Sort requests
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'deadline':
          aValue = new Date(a.deadline).getTime()
          bValue = new Date(b.deadline).getTime()
          break
        case 'submitted':
          aValue = new Date(a.submittedAt).getTime()
          bValue = new Date(b.submittedAt).getTime()
          break
        case 'priority':
          const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }
          aValue = priorityOrder[a.priority]
          bValue = priorityOrder[b.priority]
          break
        case 'risk':
          aValue = a.riskScore
          bValue = b.riskScore
          break
        default:
          return 0
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [requests, selectedFilter, selectedPriority, sortBy, sortOrder, address])

  const getPriorityColor = (priority: PendingRequest['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
    }
  }

  const getStatusColor = (status: PendingRequest['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'under_review': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
      case 'requires_changes': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-600 dark:text-red-400'
    if (score >= 60) return 'text-orange-600 dark:text-orange-400'
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getSeverityColor = (severity: ComplianceFlag['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
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

  const getTimeRemaining = (deadline: Date) => {
    const now = new Date()
    const diff = deadline.getTime() - now.getTime()
    
    if (diff <= 0) return 'Overdue'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h remaining`
    return `${hours}h remaining`
  }

  const handleAction = () => {
    if (!selectedRequest) return

    const action: AuditorAction = {
      type: actionType,
      reason: actionReason,
      conditions: actionConditions.length > 0 ? actionConditions : undefined,
      recommendations: actionRecommendations.length > 0 ? actionRecommendations : undefined
    }

    switch (actionType) {
      case 'approve':
        onApproveRequest?.(selectedRequest.id, action)
        break
      case 'reject':
        onRejectRequest?.(selectedRequest.id, action)
        break
      case 'request_changes':
        onRequestChanges?.(selectedRequest.id, action)
        break
      case 'escalate':
        onEscalateRequest?.(selectedRequest.id, action)
        break
    }

    setShowActionModal(false)
    setActionReason('')
    setActionConditions([])
    setActionRecommendations([])
  }

  const openActionModal = (request: PendingRequest, type: AuditorAction['type']) => {
    setSelectedRequest(request)
    setActionType(type)
    setShowActionModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Auditor Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Review and approve computation requests • {filteredAndSortedRequests.length} pending reviews
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Active Auditor</span>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {requests.filter(r => r.status === 'pending' && r.assignedAuditors.includes(address || '')).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Under Review</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {requests.filter(r => r.status === 'under_review' && r.assignedAuditors.includes(address || '')).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">High Risk</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {requests.filter(r => r.riskScore >= 70 && r.assignedAuditors.includes(address || '')).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">This Week</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">12</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="requires_changes">Requires Changes</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="deadline">Deadline</option>
            <option value="submitted">Submitted Date</option>
            <option value="priority">Priority</option>
            <option value="risk">Risk Score</option>
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
      <div className="space-y-4">
        {filteredAndSortedRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No requests to review</h3>
            <p className="text-gray-600 dark:text-gray-400">All assigned requests have been processed.</p>
          </div>
        ) : (
          filteredAndSortedRequests.map(request => (
            <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              {/* Request Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {request.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(request.priority)}`}>
                      {request.priority.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>by {request.submitter}</span>
                    <span>•</span>
                    <span>Submitted: {formatDate(request.submittedAt)}</span>
                    <span>•</span>
                    <span className={new Date(request.deadline) < new Date() ? 'text-red-600' : ''}>
                      {getTimeRemaining(request.deadline)}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-3">{request.description}</p>
                </div>
                
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getRiskColor(request.riskScore)}`}>
                    {request.riskScore}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Risk Score</div>
                </div>
              </div>

              {/* Compliance Flags */}
              {request.complianceFlags.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Compliance Issues ({request.complianceFlags.filter(f => !f.resolved).length} unresolved)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {request.complianceFlags.map(flag => (
                      <div
                        key={flag.id}
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(flag.severity)} ${flag.resolved ? 'opacity-50' : ''}`}
                      >
                        {flag.resolved && '✓ '}
                        {flag.type}: {flag.description}
                      </div>
                    ))}
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
                          {CATEGORIES[dataset.category]} • {dataset.sensitivityLevel} • {formatFileSize(dataset.size)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          dataset.complianceStatus === 'compliant' ? 'bg-green-500' :
                          dataset.complianceStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <span className="text-xs text-gray-500 dark:text-gray-400">{dataset.encryptionStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Approvals Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>Approvals</span>
                  <span>{request.receivedApprovals}/{request.requiredApprovals}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(request.receivedApprovals / request.requiredApprovals) * 100}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>Cost: {request.estimatedCost} ETH</span>
                  <span>•</span>
                  <span>{request.attachments.length} attachments</span>
                  {request.previousVersions && (
                    <>
                      <span>•</span>
                      <span className="text-orange-600">Revised</span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 border border-gray-300 dark:border-gray-600 rounded"
                  >
                    View Details
                  </button>
                  
                  {request.status !== 'approved' && request.status !== 'rejected' && (
                    <>
                      <button
                        onClick={() => openActionModal(request, 'approve')}
                        className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openActionModal(request, 'request_changes')}
                        className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded"
                      >
                        Request Changes
                      </button>
                      <button
                        onClick={() => openActionModal(request, 'reject')}
                        className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Request Detail Modal */}
      {selectedRequest && !showActionModal && (
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
                {/* Full Description */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Description</h4>
                  <p className="text-gray-700 dark:text-gray-300">{selectedRequest.description}</p>
                </div>

                {/* Attachments */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Attachments ({selectedRequest.attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedRequest.attachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded p-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{attachment.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {attachment.type} • {formatFileSize(attachment.size)} • {formatDate(attachment.uploadedAt)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {attachment.verified ? (
                            <span className="text-green-600 dark:text-green-400 text-sm">✓ Verified</span>
                          ) : (
                            <span className="text-yellow-600 dark:text-yellow-400 text-sm">⚠ Pending</span>
                          )}
                          <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm">
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {selectedRequest.status !== 'approved' && selectedRequest.status !== 'rejected' && (
                    <>
                      <button
                        onClick={() => openActionModal(selectedRequest, 'approve')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                      >
                        Approve Request
                      </button>
                      <button
                        onClick={() => openActionModal(selectedRequest, 'request_changes')}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
                      >
                        Request Changes
                      </button>
                      <button
                        onClick={() => openActionModal(selectedRequest, 'reject')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                      >
                        Reject Request
                      </button>
                      <button
                        onClick={() => openActionModal(selectedRequest, 'escalate')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                      >
                        Escalate
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {actionType === 'approve' && 'Approve Request'}
                {actionType === 'reject' && 'Reject Request'}
                {actionType === 'request_changes' && 'Request Changes'}
                {actionType === 'escalate' && 'Escalate Request'}
              </h3>
              <button
                onClick={() => setShowActionModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason *
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Provide a detailed reason for your decision..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              {actionType === 'approve' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Approval Conditions (optional)
                  </label>
                  <textarea
                    value={actionConditions.join('\n')}
                    onChange={(e) => setActionConditions(e.target.value.split('\n').filter(c => c.trim()))}
                    placeholder="List any conditions that must be met..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {(actionType === 'request_changes' || actionType === 'reject') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recommendations
                  </label>
                  <textarea
                    value={actionRecommendations.join('\n')}
                    onChange={(e) => setActionRecommendations(e.target.value.split('\n').filter(r => r.trim()))}
                    placeholder="Provide recommendations for improvement..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={!actionReason.trim()}
                  className={`px-4 py-2 text-white rounded-lg ${
                    actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                    actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                    actionType === 'request_changes' ? 'bg-yellow-600 hover:bg-yellow-700' :
                    'bg-purple-600 hover:bg-purple-700'
                  } disabled:bg-gray-400`}
                >
                  Confirm {actionType.replace('_', ' ')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}