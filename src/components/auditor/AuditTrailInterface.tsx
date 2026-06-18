'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface AuditLogEntry {
  id: string
  timestamp: Date
  actor: string
  actorAddress: string
  action: AuditAction
  target: AuditTarget
  details: AuditDetails
  metadata: AuditMetadata
  ipfsHash?: string
  blockNumber?: number
  transactionHash?: string
}

interface AuditAction {
  type: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'view' | 'download' | 'share' | 'compute' | 'verify'
  category: 'request' | 'dataset' | 'result' | 'user' | 'system' | 'compliance'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface AuditTarget {
  type: 'request' | 'dataset' | 'result' | 'user' | 'system'
  id: string
  name: string
  owner?: string
  category?: string
}

interface AuditDetails {
  changes?: Record<string, { from: any; to: any }>
  parameters?: Record<string, any>
  reason?: string
  conditions?: string[]
  outcome?: 'success' | 'failure' | 'partial'
  errorMessage?: string
}

interface AuditMetadata {
  userAgent?: string
  ipAddress: string
  sessionId: string
  requestId?: string
  computationId?: string
  datasetIds?: string[]
  geolocation?: {
    country: string
    region: string
    city: string
  }
  riskScore?: number
  complianceFlags?: string[]
}

interface AuditTrailProps {
  targetId?: string
  targetType?: AuditTarget['type']
  onExportLogs?: (entries: AuditLogEntry[]) => void
  onVerifyIntegrity?: () => void
}

export function AuditTrailInterface({
  targetId,
  targetType,
  onExportLogs,
  onVerifyIntegrity
}: AuditTrailProps) {
  const { address } = useAccount()

  // Mock audit log data - in real app this would come from blockchain/IPFS
  const [auditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'audit_001',
      timestamp: new Date('2024-01-20T10:30:00'),
      actor: 'Dr. Sarah Chen',
      actorAddress: '0x123456789abcdef',
      action: {
        type: 'create',
        category: 'request',
        description: 'Created new computation request for medical AI training',
        severity: 'medium'
      },
      target: {
        type: 'request',
        id: 'req_audit_001',
        name: 'Medical AI Training Dataset Request',
        owner: '0x123456789abcdef',
        category: 'ml'
      },
      details: {
        parameters: {
          datasets: ['ds_med_001'],
          computationType: 'ml',
          estimatedCost: 2.5
        },
        outcome: 'success'
      },
      metadata: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ipAddress: '192.168.1.100',
        sessionId: 'sess_12345',
        requestId: 'req_audit_001',
        datasetIds: ['ds_med_001'],
        geolocation: {
          country: 'US',
          region: 'CA',
          city: 'San Francisco'
        },
        riskScore: 75,
        complianceFlags: ['HIPAA_REVIEW_REQUIRED']
      },
      ipfsHash: 'QmX7Gg3N2YjXzKvq3K2oJ8wMr5vNp2jQ1hK6Rt9sW8xYz',
      blockNumber: 18500123,
      transactionHash: '0xabc123def456789...'
    },
    {
      id: 'audit_002',
      timestamp: new Date('2024-01-20T11:15:00'),
      actor: 'System Auditor',
      actorAddress: address || '0x742d35Cc...789',
      action: {
        type: 'approve',
        category: 'request',
        description: 'Approved computation request after compliance review',
        severity: 'high'
      },
      target: {
        type: 'request',
        id: 'req_audit_001',
        name: 'Medical AI Training Dataset Request',
        owner: '0x123456789abcdef'
      },
      details: {
        reason: 'All compliance checks passed. IRB approval verified. Risk assessment completed.',
        conditions: [
          'Results must be anonymized before sharing',
          'Data retention limited to 2 years',
          'Regular compliance audits required'
        ],
        outcome: 'success'
      },
      metadata: {
        userAgent: 'AuditorApp/1.0',
        ipAddress: '10.0.1.50',
        sessionId: 'sess_67890',
        requestId: 'req_audit_001',
        riskScore: 35,
        complianceFlags: ['APPROVED_WITH_CONDITIONS']
      },
      ipfsHash: 'QmY8Hh4O3ZkXzLwr4L3pK9xNs6qR2iS0jT7Uw0tX9yAb',
      blockNumber: 18500156,
      transactionHash: '0xdef456ghi789012...'
    },
    {
      id: 'audit_003',
      timestamp: new Date('2024-01-20T15:45:00'),
      actor: 'SMPC Engine',
      actorAddress: '0xSMPCEngine',
      action: {
        type: 'compute',
        category: 'system',
        description: 'Executed secure multi-party computation',
        severity: 'high'
      },
      target: {
        type: 'request',
        id: 'req_audit_001',
        name: 'Medical AI Training Dataset Request'
      },
      details: {
        parameters: {
          algorithm: 'federated_learning',
          epochs: 100,
          participants: 3,
          encryptionLevel: 'AES-256'
        },
        outcome: 'success'
      },
      metadata: {
        ipAddress: '10.0.0.10',
        sessionId: 'compute_session_001',
        requestId: 'req_audit_001',
        computationId: 'comp_001',
        datasetIds: ['ds_med_001'],
        riskScore: 15
      },
      ipfsHash: 'QmZ9Ii5P4AlY0Mxs5M4qL0yOt7rS3kU1vX8Vv1uZ0bCd',
      blockNumber: 18500289,
      transactionHash: '0xghi789jkl012345...'
    },
    {
      id: 'audit_004',
      timestamp: new Date('2024-01-20T16:00:00'),
      actor: 'Data Consumer',
      actorAddress: '0x123456789abcdef',
      action: {
        type: 'download',
        category: 'result',
        description: 'Downloaded computation results',
        severity: 'medium'
      },
      target: {
        type: 'result',
        id: 'result_001',
        name: 'Medical AI Training Results',
        owner: '0x123456789abcdef'
      },
      details: {
        parameters: {
          format: 'json',
          encrypted: true,
          fileSize: 2048576
        },
        outcome: 'success'
      },
      metadata: {
        userAgent: 'ConsumerApp/2.1',
        ipAddress: '192.168.1.100',
        sessionId: 'sess_12345',
        requestId: 'req_audit_001',
        geolocation: {
          country: 'US',
          region: 'CA',
          city: 'San Francisco'
        }
      },
      ipfsHash: 'QmA0Jj6Q5BmZ1Nyt6N5rM1zPu8sT4lV2wY9Ww2vA1dEf',
      blockNumber: 18500295,
      transactionHash: '0xjkl012mno345678...'
    },
    {
      id: 'audit_005',
      timestamp: new Date('2024-01-21T09:20:00'),
      actor: 'Compliance Officer',
      actorAddress: '0x987654321fedcba',
      action: {
        type: 'reject',
        category: 'request',
        description: 'Rejected computation request due to security concerns',
        severity: 'critical'
      },
      target: {
        type: 'request',
        id: 'req_audit_003',
        name: 'Financial Trading Algorithm Validation',
        owner: '0x987654321abcdef'
      },
      details: {
        reason: 'Algorithm code requires security audit before execution. Additional compliance documentation needed for financial data usage.',
        outcome: 'success',
        errorMessage: 'Security audit pending'
      },
      metadata: {
        userAgent: 'ComplianceApp/1.5',
        ipAddress: '10.0.2.25',
        sessionId: 'compliance_sess_001',
        requestId: 'req_audit_003',
        riskScore: 89,
        complianceFlags: ['SECURITY_AUDIT_REQUIRED', 'FINANCIAL_COMPLIANCE_NEEDED']
      },
      ipfsHash: 'QmB1Kk7R6CnA2Ozu7O6sN2Ar9uV5mW3xZ0Xx3wB2eGh',
      blockNumber: 18501156,
      transactionHash: '0xmno345pqr678901...'
    }
  ])

  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')
  const [selectedActionType, setSelectedActionType] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null)
  const [showIntegrityCheck, setShowIntegrityCheck] = useState(false)
  const [integrityStatus, setIntegrityStatus] = useState<'valid' | 'invalid' | 'checking'>('valid')

  // Filter and sort logs
  const filteredAndSortedLogs = useMemo(() => {
    let filtered = auditLogs.filter(log => {
      // Time range filter
      const now = new Date()
      const timeThreshold = new Date()
      switch (selectedTimeRange) {
        case '1h':
          timeThreshold.setHours(now.getHours() - 1)
          break
        case '24h':
          timeThreshold.setDate(now.getDate() - 1)
          break
        case '7d':
          timeThreshold.setDate(now.getDate() - 7)
          break
        case '30d':
          timeThreshold.setDate(now.getDate() - 30)
          break
        default:
          timeThreshold.setFullYear(2000) // Show all
      }
      
      if (log.timestamp < timeThreshold) return false

      // Target filter
      if (targetId && targetType) {
        if (log.target.type !== targetType || log.target.id !== targetId) {
          return false
        }
      }

      // Action type filter
      if (selectedActionType !== 'all' && log.action.type !== selectedActionType) {
        return false
      }

      // Category filter
      if (selectedCategory !== 'all' && log.action.category !== selectedCategory) {
        return false
      }

      // Severity filter
      if (selectedSeverity !== 'all' && log.action.severity !== selectedSeverity) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!log.action.description.toLowerCase().includes(query) &&
            !log.actor.toLowerCase().includes(query) &&
            !log.target.name.toLowerCase().includes(query)) {
          return false
        }
      }

      return true
    })

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return filtered
  }, [auditLogs, selectedTimeRange, targetId, targetType, selectedActionType, selectedCategory, selectedSeverity, searchQuery])

  const getActionColor = (action: AuditAction) => {
    switch (action.type) {
      case 'create': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
      case 'update': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'delete': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
      case 'approve': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
      case 'reject': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
      case 'view': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'download': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
      case 'compute': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getSeverityColor = (severity: AuditAction['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600 dark:text-red-400'
      case 'high': return 'text-orange-600 dark:text-orange-400'
      case 'medium': return 'text-yellow-600 dark:text-yellow-400'
      case 'low': return 'text-green-600 dark:text-green-400'
    }
  }

  const getActionIcon = (actionType: AuditAction['type']) => {
    switch (actionType) {
      case 'create':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )
      case 'update':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )
      case 'delete':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )
      case 'approve':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'reject':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'download':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'compute':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const handleExportLogs = () => {
    onExportLogs?.(filteredAndSortedLogs)
  }

  const handleVerifyIntegrity = async () => {
    setShowIntegrityCheck(true)
    setIntegrityStatus('checking')
    
    // Simulate integrity check
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Mock integrity check result
    setIntegrityStatus(Math.random() > 0.1 ? 'valid' : 'invalid')
    onVerifyIntegrity?.()
  }

  const getStatsData = () => {
    const totalLogs = filteredAndSortedLogs.length
    const criticalLogs = filteredAndSortedLogs.filter(log => log.action.severity === 'critical').length
    const uniqueActors = new Set(filteredAndSortedLogs.map(log => log.actorAddress)).size
    const failedActions = filteredAndSortedLogs.filter(log => log.details.outcome === 'failure').length

    return { totalLogs, criticalLogs, uniqueActors, failedActions }
  }

  const stats = getStatsData()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Trail</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive logging and traceability of all system activities
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleVerifyIntegrity}
            disabled={showIntegrityCheck && integrityStatus === 'checking'}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg flex items-center space-x-2"
          >
            {showIntegrityCheck && integrityStatus === 'checking' ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.586-2.58a1 1 0 011.414 1.414L10.414 17H9v-1.414l8.586-8.586z" />
              </svg>
            )}
            <span>Verify Integrity</span>
          </button>
          
          <button
            onClick={handleExportLogs}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Export Logs
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Entries</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalLogs}</p>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Critical Events</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.criticalLogs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unique Actors</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.uniqueActors}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
              showIntegrityCheck 
                ? integrityStatus === 'valid' 
                  ? 'bg-green-100 dark:bg-green-900/50'
                  : integrityStatus === 'invalid' 
                    ? 'bg-red-100 dark:bg-red-900/50'
                    : 'bg-yellow-100 dark:bg-yellow-900/50'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              {showIntegrityCheck && integrityStatus === 'checking' ? (
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : showIntegrityCheck && integrityStatus === 'valid' ? (
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : showIntegrityCheck && integrityStatus === 'invalid' ? (
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.586-2.58a1 1 0 011.414 1.414L10.414 17H9v-1.414l8.586-8.586z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Integrity</p>
              <p className={`text-xl font-bold ${
                showIntegrityCheck
                  ? integrityStatus === 'valid'
                    ? 'text-green-600 dark:text-green-400'
                    : integrityStatus === 'invalid'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {showIntegrityCheck
                  ? integrityStatus === 'checking'
                    ? 'Checking...'
                    : integrityStatus === 'valid'
                      ? 'Valid'
                      : 'Invalid'
                  : 'Unknown'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actions, actors, or targets..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Range</label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
              <option value="view">View</option>
              <option value="download">Download</option>
              <option value="compute">Compute</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Categories</option>
              <option value="request">Request</option>
              <option value="dataset">Dataset</option>
              <option value="result">Result</option>
              <option value="user">User</option>
              <option value="system">System</option>
              <option value="compliance">Compliance</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Entries */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-white">Audit Log Entries</h3>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredAndSortedLogs.length} of {auditLogs.length} entries
            </span>
          </div>
        </div>

        {filteredAndSortedLogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No audit entries found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters to see more results.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedLogs.map(entry => (
              <div
                key={entry.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                onClick={() => setSelectedEntry(entry)}
              >
                <div className="flex items-start space-x-4">
                  {/* Action Icon */}
                  <div className={`p-2 rounded-full ${getActionColor(entry.action).replace('text-', 'text-white bg-').split(' ')[0]}`}>
                    {getActionIcon(entry.action.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.action.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-600 dark:text-gray-400">by {entry.actor}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{entry.target.name}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(entry.action)}`}>
                          {entry.action.type}
                        </span>
                        <span className={`text-xs font-medium ${getSeverityColor(entry.action.severity)}`}>
                          {entry.action.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatTimestamp(entry.timestamp)}</span>
                        {entry.blockNumber && (
                          <>
                            <span>•</span>
                            <span>Block #{entry.blockNumber}</span>
                          </>
                        )}
                        {entry.metadata.riskScore !== undefined && (
                          <>
                            <span>•</span>
                            <span>Risk: {entry.metadata.riskScore}</span>
                          </>
                        )}
                      </div>
                      
                      {entry.details.outcome && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          entry.details.outcome === 'success' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                            : entry.details.outcome === 'failure'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                        }`}>
                          {entry.details.outcome}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Audit Log Entry Details
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Entry ID: {selectedEntry.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Action Details</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Type:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${getActionColor(selectedEntry.action)}`}>
                          {selectedEntry.action.type}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Category:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {selectedEntry.action.category}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Severity:</span>
                        <span className={`ml-2 font-medium ${getSeverityColor(selectedEntry.action.severity)}`}>
                          {selectedEntry.action.severity}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Description:</span>
                        <p className="mt-1 text-gray-900 dark:text-white">{selectedEntry.action.description}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Actor & Target</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Actor:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {selectedEntry.actor}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Address:</span>
                        <code className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {selectedEntry.actorAddress}
                        </code>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Target:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {selectedEntry.target.name}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Target Type:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {selectedEntry.target.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Details</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(selectedEntry.details, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Metadata */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Metadata</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(selectedEntry.metadata, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Blockchain Info */}
                {(selectedEntry.blockNumber || selectedEntry.transactionHash || selectedEntry.ipfsHash) && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Blockchain Verification</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {selectedEntry.blockNumber && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Block Number:</span>
                          <code className="block mt-1 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {selectedEntry.blockNumber}
                          </code>
                        </div>
                      )}
                      {selectedEntry.transactionHash && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Transaction Hash:</span>
                          <code className="block mt-1 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded break-all">
                            {selectedEntry.transactionHash}
                          </code>
                        </div>
                      )}
                      {selectedEntry.ipfsHash && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">IPFS Hash:</span>
                          <code className="block mt-1 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded break-all">
                            {selectedEntry.ipfsHash}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}