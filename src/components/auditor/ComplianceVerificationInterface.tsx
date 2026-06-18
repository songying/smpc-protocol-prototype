'use client'

import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface ComplianceCheck {
  id: string
  name: string
  category: 'privacy' | 'security' | 'regulatory' | 'technical' | 'ethical'
  description: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  status: 'passed' | 'failed' | 'warning' | 'skipped' | 'running'
  automated: boolean
  required: boolean
  lastRun?: Date
  duration?: number
  details?: ComplianceCheckDetail[]
  remediation?: string[]
}

interface ComplianceCheckDetail {
  field: string
  expected: any
  actual: any
  passed: boolean
  message: string
}

interface ComplianceProfile {
  id: string
  name: string
  description: string
  jurisdiction: string
  regulations: string[]
  checks: ComplianceCheck[]
  lastUpdated: Date
  version: string
}

interface DatasetCompliance {
  datasetId: string
  datasetTitle: string
  provider: string
  category: number
  overallScore: number
  passedChecks: number
  totalChecks: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  lastScanned: Date
  issues: ComplianceIssue[]
  recommendations: string[]
}

interface ComplianceIssue {
  id: string
  type: 'privacy' | 'security' | 'regulatory' | 'technical' | 'ethical'
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  description: string
  affectedFields?: string[]
  suggestedFix?: string
  autoFixAvailable: boolean
  resolved: boolean
}

interface ComplianceVerificationProps {
  requestId?: string
  datasets?: any[]
  onComplianceComplete?: (results: DatasetCompliance[]) => void
  onApplyAutoFixes?: (issues: ComplianceIssue[]) => void
}

export function ComplianceVerificationInterface({
  requestId,
  datasets = [],
  onComplianceComplete,
  onApplyAutoFixes
}: ComplianceVerificationProps) {
  const { address } = useAccount()

  // Mock compliance profiles
  const [profiles] = useState<ComplianceProfile[]>([
    {
      id: 'gdpr',
      name: 'GDPR Compliance',
      description: 'General Data Protection Regulation (EU)',
      jurisdiction: 'EU',
      regulations: ['GDPR Article 6', 'GDPR Article 9', 'GDPR Article 17'],
      version: '2.1.0',
      lastUpdated: new Date('2024-01-15'),
      checks: [
        {
          id: 'gdpr_consent',
          name: 'Valid Consent Verification',
          category: 'regulatory',
          description: 'Verify that proper consent has been obtained for data processing',
          severity: 'critical',
          status: 'passed',
          automated: true,
          required: true,
          lastRun: new Date('2024-01-20T10:30:00'),
          duration: 2000,
          details: [
            {
              field: 'consent_mechanism',
              expected: 'explicit',
              actual: 'explicit',
              passed: true,
              message: 'Explicit consent mechanism detected'
            },
            {
              field: 'consent_timestamp',
              expected: 'within_2_years',
              actual: '2023-12-15',
              passed: true,
              message: 'Consent obtained within required timeframe'
            }
          ]
        },
        {
          id: 'gdpr_anonymization',
          name: 'Data Anonymization Check',
          category: 'privacy',
          description: 'Ensure personal identifiers are properly anonymized',
          severity: 'error',
          status: 'warning',
          automated: true,
          required: true,
          lastRun: new Date('2024-01-20T10:32:00'),
          duration: 5000,
          details: [
            {
              field: 'direct_identifiers',
              expected: 'removed',
              actual: 'hashed',
              passed: true,
              message: 'Direct identifiers properly hashed'
            },
            {
              field: 'quasi_identifiers',
              expected: 'k_anonymity >= 5',
              actual: 'k_anonymity = 3',
              passed: false,
              message: 'K-anonymity below recommended threshold'
            }
          ],
          remediation: [
            'Increase k-anonymity to at least 5',
            'Consider l-diversity for sensitive attributes',
            'Apply additional generalization techniques'
          ]
        },
        {
          id: 'gdpr_purpose_limitation',
          name: 'Purpose Limitation Compliance',
          category: 'regulatory',
          description: 'Verify data usage aligns with stated purposes',
          severity: 'warning',
          status: 'passed',
          automated: true,
          required: true,
          lastRun: new Date('2024-01-20T10:35:00'),
          duration: 1500
        }
      ]
    },
    {
      id: 'hipaa',
      name: 'HIPAA Compliance',
      description: 'Health Insurance Portability and Accountability Act (US)',
      jurisdiction: 'US',
      regulations: ['HIPAA Privacy Rule', 'HIPAA Security Rule', 'HIPAA Breach Notification Rule'],
      version: '1.8.0',
      lastUpdated: new Date('2024-01-10'),
      checks: [
        {
          id: 'hipaa_phi_protection',
          name: 'PHI Protection Verification',
          category: 'privacy',
          description: 'Ensure Protected Health Information is properly safeguarded',
          severity: 'critical',
          status: 'passed',
          automated: true,
          required: true,
          lastRun: new Date('2024-01-20T10:40:00'),
          duration: 3000
        },
        {
          id: 'hipaa_access_controls',
          name: 'Access Control Validation',
          category: 'security',
          description: 'Verify appropriate access controls are in place',
          severity: 'error',
          status: 'failed',
          automated: true,
          required: true,
          lastRun: new Date('2024-01-20T10:42:00'),
          duration: 2500,
          remediation: [
            'Implement role-based access controls',
            'Add multi-factor authentication',
            'Enable audit logging for all access attempts'
          ]
        }
      ]
    }
  ])

  // Mock dataset compliance results
  const [datasetCompliance] = useState<DatasetCompliance[]>([
    {
      datasetId: 'ds_med_001',
      datasetTitle: 'Cardiovascular Studies Dataset',
      provider: 'MedData Research',
      category: 2,
      overallScore: 78,
      passedChecks: 7,
      totalChecks: 9,
      riskLevel: 'medium',
      lastScanned: new Date('2024-01-20T10:45:00'),
      issues: [
        {
          id: 'issue_001',
          type: 'privacy',
          severity: 'warning',
          title: 'K-Anonymity Below Threshold',
          description: 'The dataset has k-anonymity of 3, which is below the recommended threshold of 5 for medical data.',
          affectedFields: ['age', 'zip_code', 'diagnosis_date'],
          suggestedFix: 'Apply additional generalization to age and zip_code fields',
          autoFixAvailable: true,
          resolved: false
        },
        {
          id: 'issue_002',
          type: 'regulatory',
          severity: 'error',
          title: 'Missing IRB Documentation',
          description: 'Institutional Review Board approval documentation is not attached to the dataset.',
          suggestedFix: 'Upload IRB approval certificate',
          autoFixAvailable: false,
          resolved: false
        }
      ],
      recommendations: [
        'Increase k-anonymity to minimum of 5',
        'Provide IRB approval documentation',
        'Consider implementing l-diversity for sensitive attributes',
        'Add data retention policy documentation'
      ]
    }
  ])

  const [selectedProfile, setSelectedProfile] = useState<ComplianceProfile>(profiles[0])
  const [runningChecks, setRunningChecks] = useState<Set<string>>(new Set())
  const [selectedDataset, setSelectedDataset] = useState<DatasetCompliance | null>(null)
  const [showFixModal, setShowFixModal] = useState(false)
  const [autoFixableIssues, setAutoFixableIssues] = useState<ComplianceIssue[]>([])

  const runComplianceCheck = async (checkId: string) => {
    setRunningChecks(prev => new Set(prev).add(checkId))
    
    // Simulate check execution
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))
    
    setRunningChecks(prev => {
      const updated = new Set(prev)
      updated.delete(checkId)
      return updated
    })
  }

  const runAllChecks = async () => {
    const automatedChecks = selectedProfile.checks.filter(check => check.automated)
    
    for (const check of automatedChecks) {
      await runComplianceCheck(check.id)
    }
    
    // Notify completion
    onComplianceComplete?.(datasetCompliance)
  }

  const getStatusColor = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'skipped': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
    }
  }

  const getStatusIcon = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'passed':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'running':
        return (
          <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        )
    }
  }

  const getSeverityColor = (severity: ComplianceCheck['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600 dark:text-red-400'
      case 'error': return 'text-red-600 dark:text-red-400'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400'
      case 'info': return 'text-blue-600 dark:text-blue-400'
    }
  }

  const getRiskColor = (level: DatasetCompliance['riskLevel']) => {
    switch (level) {
      case 'critical': return 'text-red-600 dark:text-red-400'
      case 'high': return 'text-red-600 dark:text-red-400'
      case 'medium': return 'text-yellow-600 dark:text-yellow-400'
      case 'low': return 'text-green-600 dark:text-green-400'
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  const handleApplyAutoFixes = () => {
    const fixableIssues = datasetCompliance
      .flatMap(dc => dc.issues)
      .filter(issue => issue.autoFixAvailable && !issue.resolved)
    
    setAutoFixableIssues(fixableIssues)
    setShowFixModal(true)
  }

  const confirmAutoFixes = () => {
    onApplyAutoFixes?.(autoFixableIssues)
    setShowFixModal(false)
    setAutoFixableIssues([])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Compliance Verification</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Automated compliance checks and regulatory validation
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={runAllChecks}
            disabled={runningChecks.size > 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg flex items-center space-x-2"
          >
            {runningChecks.size > 0 ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>Run All Checks</span>
          </button>
          
          <button
            onClick={handleApplyAutoFixes}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            Apply Auto-Fixes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Compliance Profiles */}
        <div className="space-y-6">
          {/* Profile Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Compliance Profiles</h3>
            
            <div className="space-y-3">
              {profiles.map(profile => (
                <div
                  key={profile.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedProfile.id === profile.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedProfile(profile)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{profile.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{profile.jurisdiction}</p>
                    </div>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                      v{profile.version}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{profile.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Profile Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Profile Details</h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Regulations:</span>
                <div className="mt-1">
                  {selectedProfile.regulations.map(reg => (
                    <span key={reg} className="inline-block bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded mr-1 mb-1">
                      {reg}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Total Checks: </span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedProfile.checks.length}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Last Updated: </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedProfile.lastUpdated.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column - Compliance Checks */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">Compliance Checks</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {selectedProfile.checks.filter(c => c.automated).length} automated checks available
              </p>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {selectedProfile.checks.map(check => (
                <div key={check.id} className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {getStatusIcon(runningChecks.has(check.id) ? 'running' : check.status)}
                        <h4 className="font-medium text-gray-900 dark:text-white">{check.name}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(runningChecks.has(check.id) ? 'running' : check.status)}`}>
                          {runningChecks.has(check.id) ? 'Running' : check.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{check.description}</p>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getSeverityColor(check.severity)}`}>
                        {check.severity.toUpperCase()}
                      </div>
                      {check.required && (
                        <div className="text-xs text-red-600 dark:text-red-400">Required</div>
                      )}
                    </div>
                  </div>
                  
                  {check.lastRun && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Last run: {check.lastRun.toLocaleString()}
                      {check.duration && ` (${formatDuration(check.duration)})`}
                    </div>
                  )}
                  
                  {check.details && check.details.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Details:</h5>
                      <div className="space-y-1">
                        {check.details.map((detail, index) => (
                          <div key={index} className={`text-xs p-2 rounded ${detail.passed ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
                            <strong>{detail.field}:</strong> {detail.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {check.remediation && check.remediation.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Remediation:</h5>
                      <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        {check.remediation.map((item, index) => (
                          <li key={index} className="flex items-start space-x-1">
                            <span>•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-2">
                      {check.automated ? (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                          Automated
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                          Manual
                        </span>
                      )}
                    </div>
                    
                    {check.automated && (
                      <button
                        onClick={() => runComplianceCheck(check.id)}
                        disabled={runningChecks.has(check.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 disabled:text-gray-400"
                      >
                        {runningChecks.has(check.id) ? 'Running...' : 'Run Check'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Dataset Results */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">Dataset Compliance</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {datasetCompliance.length} datasets analyzed
              </p>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {datasetCompliance.map(dataset => (
                <div
                  key={dataset.datasetId}
                  className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() => setSelectedDataset(dataset)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{dataset.datasetTitle}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">by {dataset.provider}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {dataset.overallScore}%
                      </div>
                      <div className={`text-xs font-medium ${getRiskColor(dataset.riskLevel)}`}>
                        {dataset.riskLevel.toUpperCase()} RISK
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <span>Checks: {dataset.passedChecks}/{dataset.totalChecks}</span>
                    <span>Issues: {dataset.issues.filter(i => !i.resolved).length}</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        dataset.overallScore >= 90 ? 'bg-green-500' :
                        dataset.overallScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${dataset.overallScore}%` }}
                    />
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Last scan: {dataset.lastScanned.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Detail Modal */}
      {selectedDataset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedDataset.datasetTitle}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Compliance Score: {selectedDataset.overallScore}% • {selectedDataset.riskLevel} Risk
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDataset(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Issues */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Issues ({selectedDataset.issues.filter(i => !i.resolved).length} unresolved)
                  </h4>
                  <div className="space-y-3">
                    {selectedDataset.issues.map(issue => (
                      <div key={issue.id} className={`p-4 border rounded-lg ${issue.resolved ? 'opacity-50' : ''}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-white">{issue.title}</h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{issue.description}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(issue.severity)} bg-current bg-opacity-10`}>
                            {issue.severity}
                          </span>
                        </div>
                        
                        {issue.affectedFields && (
                          <div className="mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Affected fields: </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {issue.affectedFields.join(', ')}
                            </span>
                          </div>
                        )}
                        
                        {issue.suggestedFix && (
                          <div className="mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Suggested fix: </span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{issue.suggestedFix}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          {issue.autoFixAvailable && !issue.resolved && (
                            <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                              Auto-fix available
                            </span>
                          )}
                          {issue.resolved && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                              Resolved
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Recommendations</h4>
                  <ul className="space-y-2">
                    {selectedDataset.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Fix Modal */}
      {showFixModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Apply Auto-Fixes</h3>
              <button
                onClick={() => setShowFixModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                The following {autoFixableIssues.length} issues can be automatically fixed:
              </p>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {autoFixableIssues.map(issue => (
                  <div key={issue.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">{issue.title}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{issue.suggestedFix}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowFixModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAutoFixes}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Apply Fixes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}