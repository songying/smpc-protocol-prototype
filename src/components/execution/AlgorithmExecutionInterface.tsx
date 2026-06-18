'use client'

import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface Algorithm {
  id: string
  name: string
  description: string
  computation_type: 'third_party' | 'zk' | 'fhe'
  status: 'approved' | 'pending' | 'rejected'
  version: string
}

interface SampleData {
  id: string
  name: string
  description: string
  schema: string
  tags: string[]
}

interface ComputationResult {
  requestId: string
  algorithmId: string
  computationType: 'third_party' | 'zk' | 'fhe'
  status: 'queued' | 'running' | 'completed' | 'failed' | 'timeout'
  result?: any
  encryptedResult?: string
  proof?: string
  errorMessage?: string
  executionTime: number
  verificationStatus: 'verified' | 'unverified' | 'failed'
  createdAt: string
  updatedAt: string
  completedAt?: string
}

interface ValidationResult {
  isValid: boolean
  securityScore: number
  warnings: string[]
  errors: string[]
  estimatedComplexity: 'low' | 'medium' | 'high'
  supportedComputationTypes: Array<'third_party' | 'zk' | 'fhe'>
}

export default function AlgorithmExecutionInterface() {
  const { address, isConnected } = useAccount()
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([])
  const [sampleData, setSampleData] = useState<SampleData[]>([])
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<Algorithm | null>(null)
  const [selectedData, setSelectedData] = useState<string[]>([])
  const [computationType, setComputationType] = useState<'third_party' | 'zk' | 'fhe'>('third_party')
  const [parameters, setParameters] = useState<string>('{}')
  const [privacyLevel, setPrivacyLevel] = useState<'high' | 'medium' | 'low'>('high')
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResults, setExecutionResults] = useState<ComputationResult[]>([])
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [activeTab, setActiveTab] = useState<'execute' | 'results' | 'validate'>('execute')

  useEffect(() => {
    if (isConnected) {
      loadApprovedAlgorithms()
      loadSampleData()
      loadExecutionResults()
    }
  }, [isConnected])

  const loadApprovedAlgorithms = async () => {
    try {
      const response = await fetch('/api/algorithms?status=approved&limit=50')
      const result = await response.json()
      
      if (response.ok) {
        setAlgorithms(result.algorithms || [])
      }
    } catch (error) {
      console.error('Error loading algorithms:', error)
    }
  }

  const loadSampleData = async () => {
    try {
      const response = await fetch('/api/sample-data?limit=20')
      const result = await response.json()
      
      if (response.ok) {
        setSampleData(result.data || [])
      }
    } catch (error) {
      console.error('Error loading sample data:', error)
    }
  }

  const loadExecutionResults = async () => {
    try {
      const response = await fetch('/api/execute')
      const result = await response.json()
      
      if (response.ok) {
        setExecutionResults(result.computations || [])
      }
    } catch (error) {
      console.error('Error loading execution results:', error)
    }
  }

  const executeAlgorithm = async () => {
    if (!selectedAlgorithm || selectedData.length === 0) {
      alert('Please select an algorithm and data inputs')
      return
    }

    let parsedParameters = {}
    try {
      parsedParameters = JSON.parse(parameters)
    } catch (error) {
      alert('Invalid JSON in parameters field')
      return
    }

    setIsExecuting(true)
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          algorithmId: selectedAlgorithm.id,
          computationType,
          inputDataIds: selectedData,
          parameters: parsedParameters,
          privacyLevel,
          maxExecutionTime: 60000 // 1 minute
        }),
      })

      const result = await response.json()

      if (response.ok) {
        alert(`Computation queued successfully! Request ID: ${result.requestId}`)
        loadExecutionResults()
        setActiveTab('results')
      } else {
        alert(`Execution failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Execution error:', error)
      alert('Failed to execute algorithm')
    } finally {
      setIsExecuting(false)
    }
  }

  const validateAlgorithmCode = async () => {
    if (!selectedAlgorithm) {
      alert('Please select an algorithm first')
      return
    }

    setIsValidating(true)
    try {
      // For demo purposes, we'll use mock algorithm code
      const mockCode = `
        function processHealthData(data, params) {
          // Calculate BMI statistics
          const bmiValues = data.map(record => record.personalInfo.bmi);
          const avgBMI = bmiValues.reduce((sum, bmi) => sum + bmi, 0) / bmiValues.length;
          
          // Calculate risk distribution
          const highRiskCount = data.filter(record => 
            record.riskAssessment.cardiovascularRisk === 'High'
          ).length;
          
          return {
            totalRecords: data.length,
            averageBMI: Math.round(avgBMI * 10) / 10,
            highRiskPercentage: Math.round((highRiskCount / data.length) * 100)
          };
        }
      `

      const response = await fetch('/api/execute/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          algorithmCode: mockCode,
          computationType
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setValidationResult(result.validation)
        setActiveTab('validate')
      } else {
        alert(`Validation failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Validation error:', error)
      alert('Failed to validate algorithm')
    } finally {
      setIsValidating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'queued':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
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

  if (!isConnected) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Please connect your wallet to execute algorithms
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
          Algorithm Execution Platform
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Execute approved algorithms on sample data with privacy-preserving computation
        </p>
      </div>

      {/* Tabs */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-4">
          {['execute', 'results', 'validate'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Execute Tab */}
      {activeTab === 'execute' && (
        <div className="p-6 space-y-6">
          {/* Algorithm Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Algorithm *
            </label>
            <select
              value={selectedAlgorithm?.id || ''}
              onChange={(e) => {
                const algorithm = algorithms.find(a => a.id === e.target.value)
                setSelectedAlgorithm(algorithm || null)
                if (algorithm) {
                  setComputationType(algorithm.computation_type)
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">Choose an algorithm...</option>
              {algorithms.map((algorithm) => (
                <option key={algorithm.id} value={algorithm.id}>
                  {algorithm.name} (v{algorithm.version}) - {algorithm.computation_type}
                </option>
              ))}
            </select>
            {selectedAlgorithm && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {selectedAlgorithm.description}
              </p>
            )}
          </div>

          {/* Data Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Input Data *
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md p-3">
              {sampleData.map((data) => (
                <label key={data.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedData.includes(data.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedData([...selectedData, data.id])
                      } else {
                        setSelectedData(selectedData.filter(id => id !== data.id))
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {data.name}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {data.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Selected {selectedData.length} data source{selectedData.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Computation Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Computation Type
              </label>
              <select
                value={computationType}
                onChange={(e) => setComputationType(e.target.value as any)}
                disabled={!!selectedAlgorithm}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
              >
                <option value="third_party">Third Party Computing</option>
                <option value="zk">Zero Knowledge (ZK)</option>
                <option value="fhe">Fully Homomorphic Encryption (FHE)</option>
              </select>
              {selectedAlgorithm && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Algorithm supports: {selectedAlgorithm.computation_type}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Privacy Level
              </label>
              <select
                value={privacyLevel}
                onChange={(e) => setPrivacyLevel(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="high">High (Encrypted Results)</option>
                <option value="medium">Medium (Partial Encryption)</option>
                <option value="low">Low (Plain Results)</option>
              </select>
            </div>
          </div>

          {/* Parameters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Algorithm Parameters (JSON)
            </label>
            <textarea
              value={parameters}
              onChange={(e) => setParameters(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm"
              placeholder='{"threshold": 0.5, "iterations": 100}'
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Optional parameters in JSON format
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={executeAlgorithm}
              disabled={!selectedAlgorithm || selectedData.length === 0 || isExecuting}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExecuting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Executing...
                </span>
              ) : (
                'Execute Algorithm'
              )}
            </button>
            
            <button
              onClick={validateAlgorithmCode}
              disabled={!selectedAlgorithm || isValidating}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isValidating ? 'Validating...' : 'Validate'}
            </button>
          </div>

          {/* Computation Type Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
              {computationType === 'third_party' && '🔧 Third Party Computing'}
              {computationType === 'zk' && '🔒 Zero Knowledge Computation'}
              {computationType === 'fhe' && '🛡️ Fully Homomorphic Encryption'}
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              {computationType === 'third_party' && 'Execute algorithms on secure computing nodes with result verification.'}
              {computationType === 'zk' && 'Generate zero-knowledge proofs without revealing input data.'}
              {computationType === 'fhe' && 'Perform computations on encrypted data using homomorphic encryption.'}
            </p>
          </div>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Execution Results
            </h3>
            <button
              onClick={loadExecutionResults}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Refresh
            </button>
          </div>

          {executionResults.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No execution results found
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {executionResults.map((result) => (
                <div
                  key={result.requestId}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                        {result.status}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getComputationTypeColor(result.computationType)}`}>
                        {result.computationType.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {result.requestId.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                      <p>{new Date(result.createdAt).toLocaleString()}</p>
                      {result.executionTime > 0 && (
                        <p>{result.executionTime}ms</p>
                      )}
                    </div>
                  </div>

                  {result.status === 'completed' && result.result && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Result:
                      </h4>
                      <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-sm overflow-x-auto">
                        {JSON.stringify(result.result, null, 2)}
                      </pre>
                    </div>
                  )}

                  {result.status === 'completed' && result.proof && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Verification Proof:
                      </h4>
                      <code className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs break-all block">
                        {result.proof}
                      </code>
                    </div>
                  )}

                  {result.status === 'failed' && result.errorMessage && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                        Error:
                      </h4>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {result.errorMessage}
                      </p>
                    </div>
                  )}

                  {result.verificationStatus && (
                    <div className="mt-3 flex items-center text-sm">
                      {result.verificationStatus === 'verified' ? (
                        <span className="text-green-600 dark:text-green-400 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Computation Verified
                        </span>
                      ) : (
                        <span className="text-yellow-600 dark:text-yellow-400">
                          Verification Pending
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Validation Tab */}
      {activeTab === 'validate' && (
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
            Algorithm Validation Results
          </h3>

          {validationResult ? (
            <div className="space-y-6">
              {/* Security Score */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Security Assessment
                </h4>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Security Score</span>
                      <span>{validationResult.securityScore}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          validationResult.securityScore >= 80 ? 'bg-green-500' :
                          validationResult.securityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${validationResult.securityScore}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    validationResult.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {validationResult.isValid ? 'Valid' : 'Invalid'}
                  </span>
                </div>
              </div>

              {/* Complexity */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Computational Complexity
                </h4>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  validationResult.estimatedComplexity === 'low' ? 'bg-green-100 text-green-800' :
                  validationResult.estimatedComplexity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {validationResult.estimatedComplexity.toUpperCase()}
                </span>
              </div>

              {/* Supported Types */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Supported Computation Types
                </h4>
                <div className="flex flex-wrap gap-2">
                  {validationResult.supportedComputationTypes.map((type) => (
                    <span
                      key={type}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getComputationTypeColor(type)}`}
                    >
                      {type.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Warnings */}
              {validationResult.warnings.length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    Warnings
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Errors */}
              {validationResult.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                    Errors
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {validationResult.errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-700 dark:text-red-300">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No validation results available. Select an algorithm and click "Validate" to analyze its code.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}