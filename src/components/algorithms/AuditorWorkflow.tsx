'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'

interface AlgorithmAudit {
  id: string
  algorithm_id: string
  auditor_address: string
  status: 'assigned' | 'in_review' | 'approved' | 'request_changes' | 'rejected'
  comments: string
  assigned_at: string
  completed_at?: string
  priority: 'low' | 'medium' | 'high'
  audit_checklist?: Record<string, boolean>
}

interface Algorithm {
  id: string
  name: string
  description: string
  computation_type: 'third_party' | 'zk' | 'fhe'
  version: string
  status: string
  user_address: string
  created_at: string
}

interface AuditReviewData {
  algorithm: Algorithm
  sourceCode: string
  sandboxConfig: any
}

export default function AuditorWorkflow() {
  const { address, isConnected } = useAccount()
  const [pendingAudits, setPendingAudits] = useState<AlgorithmAudit[]>([])
  const [selectedAudit, setSelectedAudit] = useState<AlgorithmAudit | null>(null)
  const [reviewData, setReviewData] = useState<AuditReviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingReview, setIsLoadingReview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [auditDecision, setAuditDecision] = useState({
    decision: '' as 'approved' | 'request_changes' | 'rejected' | '',
    comments: '',
    checklist: {} as Record<string, boolean>
  })

  const loadPendingAudits = useCallback(async () => {
    if (!isConnected || !address) {
      setPendingAudits([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/audits?status=pending')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load pending audits')
      }

      setPendingAudits(result.audits || [])
    } catch (error) {
      console.error('Error loading pending audits:', error)
      setError(error instanceof Error ? error.message : 'Failed to load audits')
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, address])

  const loadAlgorithmForReview = useCallback(async (algorithmId: string) => {
    try {
      setIsLoadingReview(true)
      setError(null)

      const response = await fetch(`/api/audits/${algorithmId}/review`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load algorithm for review')
      }

      setReviewData(result)
      
      // Initialize checklist with default values
      const defaultChecklist = getDefaultChecklist(result.algorithm.computation_type)
      setAuditDecision(prev => ({
        ...prev,
        checklist: { ...defaultChecklist, ...prev.checklist }
      }))

    } catch (error) {
      console.error('Error loading algorithm for review:', error)
      setError(error instanceof Error ? error.message : 'Failed to load algorithm')
    } finally {
      setIsLoadingReview(false)
    }
  }, [])

  const submitAuditDecision = async () => {
    if (!selectedAudit || !auditDecision.decision || !auditDecision.comments.trim()) {
      setError('Please provide a decision and comments')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/audits', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auditId: selectedAudit.id,
          decision: auditDecision.decision,
          comments: auditDecision.comments,
          auditChecklist: auditDecision.checklist
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit audit decision')
      }

      // Reset state and reload audits
      setSelectedAudit(null)
      setReviewData(null)
      setAuditDecision({
        decision: '',
        comments: '',
        checklist: {}
      })
      await loadPendingAudits()

    } catch (error) {
      console.error('Error submitting audit decision:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit decision')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPendingAudits()
  }, [loadPendingAudits])

  const getDefaultChecklist = (computationType: string): Record<string, boolean> => {
    const baseChecklist = {
      'code_quality': false,
      'security_review': false,
      'performance_check': false,
      'documentation_review': false,
      'test_coverage': false,
      'error_handling': false
    }

    const typeSpecific = {
      third_party: {
        'network_security': false,
        'data_validation': false,
        'api_compliance': false
      },
      zk: {
        'circuit_correctness': false,
        'proof_verification': false,
        'privacy_preservation': false,
        'constraint_system': false
      },
      fhe: {
        'encryption_correctness': false,
        'homomorphic_operations': false,
        'key_management': false,
        'computation_efficiency': false
      }
    }

    return {
      ...baseChecklist,
      ...(typeSpecific[computationType as keyof typeof typeSpecific] || {})
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400'
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'low':
      default:
        return 'text-green-600 dark:text-green-400'
    }
  }

  if (!isConnected) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Please connect your wallet to access auditor workflow
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pending Audits List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Pending Algorithm Audits
          </h2>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Loading audits...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <p className="text-red-800 dark:text-red-300">{error}</p>
                <button
                  onClick={loadPendingAudits}
                  className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-500"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : pendingAudits.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No pending audits assigned to you
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingAudits.map((audit) => (
                <div
                  key={audit.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedAudit?.id === audit.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => {
                    setSelectedAudit(audit)
                    loadAlgorithmForReview(audit.algorithm_id)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Algorithm ID: {audit.algorithm_id}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Assigned: {new Date(audit.assigned_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getPriorityColor(audit.priority)}`}>
                        {audit.priority.toUpperCase()} PRIORITY
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {audit.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Algorithm Review Panel */}
      {selectedAudit && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Algorithm Review
            </h2>
          </div>

          <div className="p-6">
            {isLoadingReview ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Loading algorithm for review...</p>
              </div>
            ) : reviewData ? (
              <div className="space-y-6">
                {/* Algorithm Information */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    Algorithm Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Name:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{reviewData.algorithm.name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Version:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{reviewData.algorithm.version}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Computation Type:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{reviewData.algorithm.computation_type}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Owner:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-mono text-xs">
                        {reviewData.algorithm.user_address}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Description:</span>
                    <p className="ml-2 text-gray-900 dark:text-white mt-1">{reviewData.algorithm.description}</p>
                  </div>
                </div>

                {/* Source Code */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    Source Code
                  </h3>
                  <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-auto">
                    <pre className="text-sm text-green-400 dark:text-green-300 whitespace-pre-wrap">
                      <code>{reviewData.sourceCode}</code>
                    </pre>
                  </div>
                </div>

                {/* Audit Checklist */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    Audit Checklist
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(auditDecision.checklist).map(([item, checked]) => (
                      <label key={item} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setAuditDecision(prev => ({
                            ...prev,
                            checklist: { ...prev.checklist, [item]: e.target.checked }
                          }))}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Audit Decision */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    Audit Decision
                  </h3>
                  <div className="space-y-4">
                    {/* Decision Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Decision *
                      </label>
                      <div className="flex space-x-4">
                        {[
                          { value: 'approved', label: 'Approve', color: 'green' },
                          { value: 'request_changes', label: 'Request Changes', color: 'yellow' },
                          { value: 'rejected', label: 'Reject', color: 'red' }
                        ].map((option) => (
                          <label key={option.value} className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="decision"
                              value={option.value}
                              checked={auditDecision.decision === option.value}
                              onChange={(e) => setAuditDecision(prev => ({
                                ...prev,
                                decision: e.target.value as any
                              }))}
                              className={`text-${option.color}-600 shadow-sm focus:border-${option.color}-300 focus:ring focus:ring-${option.color}-200 focus:ring-opacity-50`}
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Comments */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Comments *
                      </label>
                      <textarea
                        value={auditDecision.comments}
                        onChange={(e) => setAuditDecision(prev => ({ ...prev, comments: e.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Provide detailed feedback about the algorithm..."
                        required
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAudit(null)
                          setReviewData(null)
                          setAuditDecision({ decision: '', comments: '', checklist: {} })
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={submitAuditDecision}
                        disabled={!auditDecision.decision || !auditDecision.comments.trim() || isLoading}
                        className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Submitting...' : 'Submit Audit Decision'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  Select an audit from the list above to review the algorithm
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}