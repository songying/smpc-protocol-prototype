'use client'

import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface ComputationResult {
  id: string
  requestId: string
  title: string
  computationType: 'statistical' | 'ml' | 'analytics' | 'custom'
  status: 'processing' | 'ready' | 'downloaded' | 'expired'
  completedAt: Date
  expiresAt?: Date
  resultData: {
    summary: ResultSummary
    details: any
    visualizations?: Visualization[]
    metadata: ResultMetadata
  }
  verification: {
    isVerified: boolean
    zkProof?: string
    validators: string[]
    confidenceScore: number
  }
  download: {
    format: 'json' | 'csv' | 'xlsx' | 'pdf'
    size: number
    isEncrypted: boolean
    downloadUrl?: string
    downloadCount: number
    maxDownloads: number
  }
  sharing: {
    isPublic: boolean
    allowedUsers: string[]
    collaborators: string[]
  }
}

interface ResultSummary {
  key_findings: string[]
  statistical_significance: number
  confidence_interval: [number, number]
  sample_size: number
  execution_time: string
  privacy_preserved: boolean
}

interface Visualization {
  id: string
  type: 'chart' | 'graph' | 'heatmap' | 'scatter' | 'histogram'
  title: string
  data: any
  config: any
}

interface ResultMetadata {
  datasets_used: number
  participants: number
  privacy_score: number
  compliance_status: 'compliant' | 'warning' | 'non-compliant'
  computational_complexity: 'low' | 'medium' | 'high'
  result_quality_score: number
}

interface ResultsViewerProps {
  requestId?: string
  onDownloadResult?: (resultId: string, format: string) => void
  onShareResult?: (resultId: string, recipients: string[]) => void
  onVerifyResult?: (resultId: string) => void
}

export function ResultsViewerInterface({ 
  requestId, 
  onDownloadResult, 
  onShareResult, 
  onVerifyResult 
}: ResultsViewerProps) {
  const { address } = useAccount()
  
  // Mock data - in real app this would come from API/blockchain
  const [results] = useState<ComputationResult[]>([
    {
      id: 'result_001',
      requestId: 'req_002',
      title: 'Medical Research Correlation Study Results',
      computationType: 'ml',
      status: 'ready',
      completedAt: new Date('2024-01-18T15:45:00'),
      expiresAt: new Date('2024-02-18T15:45:00'),
      resultData: {
        summary: {
          key_findings: [
            'Strong correlation found between age and cardiovascular risk factors',
            'BMI shows significant predictive power for disease progression',
            'No significant gender-based differences observed',
            'Exercise frequency correlates negatively with risk scores'
          ],
          statistical_significance: 0.001,
          confidence_interval: [0.65, 0.78],
          sample_size: 15000,
          execution_time: '45 minutes',
          privacy_preserved: true
        },
        details: {
          correlations: {
            'age_cardiovascular_risk': 0.72,
            'bmi_disease_progression': 0.68,
            'exercise_risk_score': -0.54,
            'gender_outcomes': 0.12
          },
          model_performance: {
            accuracy: 0.87,
            precision: 0.84,
            recall: 0.89,
            f1_score: 0.86
          },
          feature_importance: {
            age: 0.28,
            bmi: 0.24,
            exercise_frequency: 0.19,
            family_history: 0.16,
            smoking_status: 0.13
          }
        },
        visualizations: [
          {
            id: 'viz_001',
            type: 'chart',
            title: 'Correlation Matrix',
            data: {
              labels: ['Age', 'BMI', 'Exercise', 'Family History', 'Smoking'],
              datasets: [{
                data: [0.72, 0.68, -0.54, 0.45, 0.38],
                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
              }]
            },
            config: { type: 'bar', responsive: true }
          },
          {
            id: 'viz_002',
            type: 'scatter',
            title: 'Age vs Risk Score Distribution',
            data: {
              datasets: [{
                label: 'Risk Distribution',
                data: Array.from({ length: 100 }, (_, i) => ({
                  x: Math.random() * 80 + 20,
                  y: Math.random() * 100
                })),
                backgroundColor: 'rgba(59, 130, 246, 0.5)'
              }]
            },
            config: { type: 'scatter', responsive: true }
          }
        ],
        metadata: {
          datasets_used: 1,
          participants: 15000,
          privacy_score: 98,
          compliance_status: 'compliant',
          computational_complexity: 'high',
          result_quality_score: 94
        }
      },
      verification: {
        isVerified: true,
        zkProof: '0xabcd1234567890abcdef...',
        validators: ['0x742d35Cc...789', '0x123456...456', '0x987654...321'],
        confidenceScore: 97
      },
      download: {
        format: 'json',
        size: 2048576, // 2MB
        isEncrypted: true,
        downloadCount: 0,
        maxDownloads: 5
      },
      sharing: {
        isPublic: false,
        allowedUsers: [address || ''],
        collaborators: []
      }
    }
  ])

  const [selectedResult, setSelectedResult] = useState<ComputationResult | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'details' | 'visualizations' | 'verification'>('summary')
  const [downloadFormat, setDownloadFormat] = useState<'json' | 'csv' | 'xlsx' | 'pdf'>('json')
  const [shareEmails, setShareEmails] = useState<string>('')
  const [showShareModal, setShowShareModal] = useState(false)

  // Filter results by requestId if provided
  const filteredResults = requestId 
    ? results.filter(result => result.requestId === requestId)
    : results

  useEffect(() => {
    if (filteredResults.length > 0 && !selectedResult) {
      setSelectedResult(filteredResults[0])
    }
  }, [filteredResults, selectedResult])

  const getStatusColor = (status: ComputationResult['status']) => {
    switch (status) {
      case 'processing': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'ready': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
      case 'downloaded': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
    }
  }

  const getComplianceColor = (status: ResultMetadata['compliance_status']) => {
    switch (status) {
      case 'compliant': return 'text-green-600 dark:text-green-400'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400'
      case 'non-compliant': return 'text-red-600 dark:text-red-400'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

  const handleDownload = () => {
    if (selectedResult) {
      onDownloadResult?.(selectedResult.id, downloadFormat)
    }
  }

  const handleShare = () => {
    if (selectedResult && shareEmails.trim()) {
      const emails = shareEmails.split(',').map(email => email.trim()).filter(email => email)
      onShareResult?.(selectedResult.id, emails)
      setShowShareModal(false)
      setShareEmails('')
    }
  }

  const handleVerify = () => {
    if (selectedResult) {
      onVerifyResult?.(selectedResult.id)
    }
  }

  const renderVisualization = (viz: Visualization) => {
    // Simple chart rendering - in a real app, you'd use a chart library like Chart.js or D3
    if (viz.type === 'chart' && viz.config.type === 'bar') {
      const maxValue = Math.max(...viz.data.datasets[0].data)
      return (
        <div className="space-y-3">
          {viz.data.labels.map((label: string, index: number) => {
            const value = viz.data.datasets[0].data[index]
            const percentage = (Math.abs(value) / maxValue) * 100
            const isNegative = value < 0
            
            return (
              <div key={label} className="flex items-center space-x-3">
                <div className="w-24 text-sm text-gray-700 dark:text-gray-300">{label}</div>
                <div className="flex-1 relative">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full ${isNegative ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                    {value.toFixed(2)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    return (
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Interactive {viz.type} visualization would be rendered here
        </p>
      </div>
    )
  }

  if (filteredResults.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No results available</h3>
        <p className="text-gray-600 dark:text-gray-400">
          {requestId ? 'This computation request has no available results yet.' : 'You have no computation results to view.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Computation Results</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {requestId ? 'View your computation results' : `${filteredResults.length} results available`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Results List */}
        {!requestId && (
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white">Your Results</h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredResults.map(result => (
                  <div
                    key={result.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      selectedResult?.id === result.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => setSelectedResult(result)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {result.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(result.completedAt)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(result.status)}`}>
                        {result.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Result Details */}
        <div className={requestId ? 'lg:col-span-4' : 'lg:col-span-3'}>
          {selectedResult && (
            <div className="space-y-6">
              {/* Result Header */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedResult.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>Completed: {formatDate(selectedResult.completedAt)}</span>
                      {selectedResult.expiresAt && (
                        <span>Expires: {formatDate(selectedResult.expiresAt)}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {selectedResult.verification.isVerified && (
                      <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium">Verified</span>
                      </div>
                    )}
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedResult.status)}`}>
                      {selectedResult.status.charAt(0).toUpperCase() + selectedResult.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {selectedResult.resultData.metadata.privacy_score}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Privacy Score</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {selectedResult.verification.confidenceScore}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Confidence</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {selectedResult.resultData.metadata.participants.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Participants</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {selectedResult.resultData.metadata.result_quality_score}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Quality Score</p>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="flex space-x-8 px-6">
                    {(['summary', 'details', 'visualizations', 'verification'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-4 text-sm font-medium border-b-2 ${
                          activeTab === tab
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {activeTab === 'summary' && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Key Findings</h4>
                        <ul className="space-y-2">
                          {selectedResult.resultData.summary.key_findings.map((finding, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-gray-700 dark:text-gray-300">{finding}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Statistical Information</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Statistical Significance:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                p = {selectedResult.resultData.summary.statistical_significance}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Confidence Interval:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                [{selectedResult.resultData.summary.confidence_interval[0]}, {selectedResult.resultData.summary.confidence_interval[1]}]
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Sample Size:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {selectedResult.resultData.summary.sample_size.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Execution Time:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {selectedResult.resultData.summary.execution_time}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Privacy & Compliance</h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Privacy Preserved:</span>
                              <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium text-green-600 dark:text-green-400">Yes</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Compliance Status:</span>
                              <span className={`font-medium ${getComplianceColor(selectedResult.resultData.metadata.compliance_status)}`}>
                                {selectedResult.resultData.metadata.compliance_status.charAt(0).toUpperCase() + selectedResult.resultData.metadata.compliance_status.slice(1)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Privacy Score:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {selectedResult.resultData.metadata.privacy_score}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'details' && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Detailed Results</h4>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                          <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify(selectedResult.resultData.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'visualizations' && (
                    <div className="space-y-6">
                      {selectedResult.resultData.visualizations?.map(viz => (
                        <div key={viz.id}>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">{viz.title}</h4>
                          {renderVisualization(viz)}
                        </div>
                      )) || (
                        <p className="text-gray-500 dark:text-gray-400">No visualizations available for this result.</p>
                      )}
                    </div>
                  )}

                  {activeTab === 'verification' && (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-3">
                        {selectedResult.verification.isVerified ? (
                          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            Result {selectedResult.verification.isVerified ? 'Verified' : 'Pending Verification'}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Confidence Score: {selectedResult.verification.confidenceScore}%
                          </p>
                        </div>
                      </div>

                      {selectedResult.verification.zkProof && (
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">Zero-Knowledge Proof</h5>
                          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                            <code className="text-sm text-gray-800 dark:text-gray-200 break-all">
                              {selectedResult.verification.zkProof}
                            </code>
                          </div>
                        </div>
                      )}

                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                          Validators ({selectedResult.verification.validators.length})
                        </h5>
                        <div className="space-y-2">
                          {selectedResult.verification.validators.map((validator, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <code className="text-sm text-gray-700 dark:text-gray-300">{validator}</code>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Download and Share Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Download & Share</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Download Section */}
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-3">Download Results</h5>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <select
                          value={downloadFormat}
                          onChange={(e) => setDownloadFormat(e.target.value as any)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="json">JSON Format</option>
                          <option value="csv">CSV Format</option>
                          <option value="xlsx">Excel Format</option>
                          <option value="pdf">PDF Report</option>
                        </select>
                        <button
                          onClick={handleDownload}
                          disabled={selectedResult.status !== 'ready'}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
                        >
                          Download
                        </button>
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>Size: {formatFileSize(selectedResult.download.size)}</p>
                        <p>Downloads: {selectedResult.download.downloadCount}/{selectedResult.download.maxDownloads}</p>
                        {selectedResult.download.isEncrypted && (
                          <p className="text-green-600 dark:text-green-400">🔒 Encrypted download</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Share Section */}
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-3">Share Results</h5>
                    <div className="space-y-3">
                      <button
                        onClick={() => setShowShareModal(true)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                      >
                        Share with Collaborators
                      </button>
                      
                      {selectedResult.sharing.collaborators.length > 0 && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p>Shared with {selectedResult.sharing.collaborators.length} collaborators</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Share Results</h3>
              <button
                onClick={() => setShowShareModal(false)}
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
                  Email addresses (comma-separated)
                </label>
                <textarea
                  value={shareEmails}
                  onChange={(e) => setShareEmails(e.target.value)}
                  placeholder="colleague@example.com, researcher@university.edu"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShare}
                  disabled={!shareEmails.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}