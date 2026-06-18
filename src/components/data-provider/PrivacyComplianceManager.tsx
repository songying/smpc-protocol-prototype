'use client'

import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface ComplianceRule {
  id: string
  name: string
  regulation: 'GDPR' | 'CCPA' | 'HIPAA' | 'PIPEDA' | 'LGPD' | 'Custom'
  description: string
  isRequired: boolean
  isActive: boolean
  lastChecked: Date
  status: 'compliant' | 'warning' | 'non-compliant' | 'pending'
  violations: string[]
  recommendations: string[]
}

interface DataRetentionPolicy {
  id: string
  dataCategory: string
  retentionPeriod: number // in days
  retentionUnit: 'days' | 'months' | 'years'
  deleteAfterExpiry: boolean
  notifyBeforeExpiry: number // days before expiry to notify
  isActive: boolean
}

interface ConsentRecord {
  id: string
  dataSubjectId: string
  datasetId: string
  consentType: 'explicit' | 'implicit' | 'opt-in' | 'opt-out'
  purposes: string[]
  grantedDate: Date
  expiryDate?: Date
  withdrawnDate?: Date
  isActive: boolean
}

interface PrivacySettings {
  dataMinimization: boolean
  purposeLimitation: boolean
  storageMinimization: boolean
  transparencyReporting: boolean
  rightsManagement: boolean
  breachNotification: boolean
  dataPortability: boolean
  automaticDeletion: boolean
}

interface AuditTrail {
  id: string
  action: string
  datasetId: string
  userId: string
  timestamp: Date
  details: string
  ipAddress: string
  userAgent: string
}

export function PrivacyComplianceManager() {
  const { address } = useAccount()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'retention' | 'consent' | 'settings' | 'audit'>('overview')
  
  // Mock data - in real app this would come from API/blockchain
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([
    {
      id: '1',
      name: 'GDPR Article 6 - Lawful Basis',
      regulation: 'GDPR',
      description: 'Ensure processing has a lawful basis under GDPR Article 6',
      isRequired: true,
      isActive: true,
      lastChecked: new Date('2024-01-20'),
      status: 'compliant',
      violations: [],
      recommendations: []
    },
    {
      id: '2',
      name: 'GDPR Article 7 - Consent',
      regulation: 'GDPR',
      description: 'Ensure consent is freely given, specific, informed and unambiguous',
      isRequired: true,
      isActive: true,
      lastChecked: new Date('2024-01-20'),
      status: 'warning',
      violations: ['Missing explicit consent for dataset #2'],
      recommendations: ['Update consent mechanism for financial data']
    },
    {
      id: '3',
      name: 'CCPA Right to Delete',
      regulation: 'CCPA',
      description: 'Provide consumers the right to delete personal information',
      isRequired: false,
      isActive: true,
      lastChecked: new Date('2024-01-19'),
      status: 'compliant',
      violations: [],
      recommendations: []
    }
  ])

  const [retentionPolicies, setRetentionPolicies] = useState<DataRetentionPolicy[]>([
    {
      id: '1',
      dataCategory: 'Personal Identifiers',
      retentionPeriod: 2,
      retentionUnit: 'years',
      deleteAfterExpiry: true,
      notifyBeforeExpiry: 30,
      isActive: true
    },
    {
      id: '2',
      dataCategory: 'Financial Records',
      retentionPeriod: 7,
      retentionUnit: 'years',
      deleteAfterExpiry: false,
      notifyBeforeExpiry: 90,
      isActive: true
    },
    {
      id: '3',
      dataCategory: 'Health Information',
      retentionPeriod: 10,
      retentionUnit: 'years',
      deleteAfterExpiry: true,
      notifyBeforeExpiry: 180,
      isActive: true
    }
  ])

  const [consentRecords] = useState<ConsentRecord[]>([
    {
      id: '1',
      dataSubjectId: 'user_123',
      datasetId: 'dataset_1',
      consentType: 'explicit',
      purposes: ['research', 'analytics'],
      grantedDate: new Date('2024-01-15'),
      expiryDate: new Date('2025-01-15'),
      isActive: true
    },
    {
      id: '2',
      dataSubjectId: 'user_456',
      datasetId: 'dataset_2',
      consentType: 'opt-in',
      purposes: ['marketing', 'personalization'],
      grantedDate: new Date('2024-01-10'),
      withdrawnDate: new Date('2024-01-18'),
      isActive: false
    }
  ])

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    dataMinimization: true,
    purposeLimitation: true,
    storageMinimization: true,
    transparencyReporting: true,
    rightsManagement: true,
    breachNotification: true,
    dataPortability: false,
    automaticDeletion: true
  })

  const [auditTrail] = useState<AuditTrail[]>([
    {
      id: '1',
      action: 'Dataset uploaded',
      datasetId: 'dataset_1',
      userId: address || 'user_123',
      timestamp: new Date('2024-01-20T10:30:00'),
      details: 'Customer survey data uploaded with GDPR compliance check',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...'
    },
    {
      id: '2',
      action: 'Consent withdrawn',
      datasetId: 'dataset_2',
      userId: 'user_456',
      timestamp: new Date('2024-01-18T14:25:00'),
      details: 'User withdrew consent for marketing purposes',
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0...'
    }
  ])

  const getStatusColor = (status: ComplianceRule['status']) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'non-compliant': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
      case 'pending': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status: ComplianceRule['status']) => {
    switch (status) {
      case 'compliant':
        return (
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'non-compliant':
        return (
          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'pending':
        return (
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const updatePrivacySetting = (setting: keyof PrivacySettings, value: boolean) => {
    setPrivacySettings(prev => ({ ...prev, [setting]: value }))
  }

  const toggleComplianceRule = (ruleId: string) => {
    setComplianceRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ))
  }

  const updateRetentionPolicy = (policyId: string, updates: Partial<DataRetentionPolicy>) => {
    setRetentionPolicies(prev => prev.map(policy => 
      policy.id === policyId ? { ...policy, ...updates } : policy
    ))
  }

  const runComplianceCheck = () => {
    console.log('Running compliance check...')
    // Implement compliance check logic
  }

  const generateComplianceReport = () => {
    console.log('Generating compliance report...')
    // Implement report generation
  }

  const complianceOverview = {
    totalRules: complianceRules.length,
    compliantRules: complianceRules.filter(r => r.status === 'compliant').length,
    warningRules: complianceRules.filter(r => r.status === 'warning').length,
    nonCompliantRules: complianceRules.filter(r => r.status === 'non-compliant').length,
    complianceScore: Math.round((complianceRules.filter(r => r.status === 'compliant').length / complianceRules.length) * 100)
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'rules', label: 'Compliance Rules', icon: '📋' },
    { id: 'retention', label: 'Data Retention', icon: '⏱️' },
    { id: 'consent', label: 'Consent Management', icon: '✋' },
    { id: 'settings', label: 'Privacy Settings', icon: '⚙️' },
    { id: 'audit', label: 'Audit Trail', icon: '🔍' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Privacy & Compliance</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage privacy settings and regulatory compliance</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={runComplianceCheck}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Run Compliance Check
          </button>
          <button
            onClick={generateComplianceReport}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium"
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Compliance Score */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Compliance Score</h3>
              <span className={`text-2xl font-bold ${
                complianceOverview.complianceScore >= 90 ? 'text-green-600 dark:text-green-400' :
                complianceOverview.complianceScore >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {complianceOverview.complianceScore}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
              <div 
                className={`h-3 rounded-full ${
                  complianceOverview.complianceScore >= 90 ? 'bg-green-500' :
                  complianceOverview.complianceScore >= 70 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${complianceOverview.complianceScore}%` }}
              />
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{complianceOverview.compliantRules}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Compliant</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{complianceOverview.warningRules}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Warnings</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{complianceOverview.nonCompliantRules}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Non-Compliant</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{complianceOverview.totalRules}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Rules</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-blue-600 dark:text-blue-400 text-lg">📋</span>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Active Violations</h4>
              </div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
                {complianceRules.reduce((sum, rule) => sum + rule.violations.length, 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Issues requiring attention</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-green-600 dark:text-green-400 text-lg">✋</span>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Active Consents</h4>
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                {consentRecords.filter(c => c.isActive).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Valid consent records</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-yellow-600 dark:text-yellow-400 text-lg">⏱️</span>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Retention Policies</h4>
              </div>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                {retentionPolicies.filter(p => p.isActive).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active policies</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Compliance Rules</h3>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {complianceRules.map(rule => (
              <div key={rule.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getStatusIcon(rule.status)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{rule.name}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(rule.status)}`}>
                          {rule.status.charAt(0).toUpperCase() + rule.status.slice(1)}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded">
                          {rule.regulation}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{rule.description}</p>
                      
                      {rule.violations.length > 0 && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Violations:</p>
                          <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                            {rule.violations.map((violation, index) => (
                              <li key={index}>{violation}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {rule.recommendations.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-1">Recommendations:</p>
                          <ul className="text-sm text-yellow-600 dark:text-yellow-400 list-disc list-inside">
                            {rule.recommendations.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Last checked: {rule.lastChecked.toLocaleDateString()}
                    </span>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={rule.isActive}
                        onChange={() => toggleComplianceRule(rule.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Active</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Privacy Settings</h3>
          
          <div className="space-y-6">
            {Object.entries(privacySettings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getSettingDescription(key as keyof PrivacySettings)}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => updatePrivacySetting(key as keyof PrivacySettings, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other tabs would be implemented similarly */}
      {activeTab !== 'overview' && activeTab !== 'rules' && activeTab !== 'settings' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {tabs.find(t => t.id === activeTab)?.label} Coming Soon
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              This feature is under development and will be available in the next update.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function getSettingDescription(setting: keyof PrivacySettings): string {
  const descriptions = {
    dataMinimization: 'Collect only data that is necessary for specified purposes',
    purposeLimitation: 'Use data only for declared purposes',
    storageMinimization: 'Keep data only as long as necessary',
    transparencyReporting: 'Provide clear information about data processing',
    rightsManagement: 'Enable data subject rights (access, rectification, erasure)',
    breachNotification: 'Notify authorities and subjects of data breaches',
    dataPortability: 'Allow data subjects to obtain and transfer their data',
    automaticDeletion: 'Automatically delete data after retention period'
  }
  return descriptions[setting] || ''
}