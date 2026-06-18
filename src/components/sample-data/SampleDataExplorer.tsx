'use client'

import React, { useState, useEffect } from 'react'

interface HealthRecord {
  personalInfo: {
    name: string
    age: number
    gender: 'M' | 'F'
    height: number
    weight: number
    bmi: number
  }
  vitalSigns: {
    systolicBP: number
    diastolicBP: number
    heartRate: number
    temperature: number
    waistCircumference: number
    hipCircumference: number
    waistHipRatio: number
  }
  bloodWork: {
    totalCholesterol: number
    ldlCholesterol: number
    hdlCholesterol: number
    triglycerides: number
    glucose: number
    hba1c: number
  }
  riskAssessment: {
    cardiovascularRisk: 'Low' | 'Medium' | 'High'
    diabetesRisk: 'Low' | 'Medium' | 'High'
    overallHealthScore: number
  }
}

interface SampleData {
  id: string
  name: string
  description: string
  schema: string
  data: HealthRecord
  owner_address: string
  privacy_level: 'high' | 'medium' | 'low' | 'public'
  computation_types: Array<'third_party' | 'zk' | 'fhe'>
  tags: string[]
  created_at: string
}

interface SampleDataExplorerProps {
  showPublicOnly?: boolean
}

export default function SampleDataExplorer({ showPublicOnly = false }: SampleDataExplorerProps) {
  const [sampleData, setSampleData] = useState<SampleData[]>([])
  const [publicSample, setPublicSample] = useState<SampleData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<SampleData | null>(null)
  const [filters, setFilters] = useState({
    computationType: '',
    tags: '',
    search: ''
  })

  useEffect(() => {
    loadSampleData()
  }, [showPublicOnly, filters])

  const loadSampleData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (showPublicOnly) {
        // Load public sample only
        const response = await fetch('/api/sample-data/public?include_schema=true')
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to load public sample')
        }
        
        setPublicSample(result.sample)
        setSampleData([result.sample])
      } else {
        // Load regular sample data with filters
        const params = new URLSearchParams()
        params.append('limit', '20')
        if (filters.computationType) params.append('computation_type', filters.computationType)
        if (filters.tags) params.append('tags', filters.tags)
        
        const response = await fetch(`/api/sample-data?${params}`)
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to load sample data')
        }
        
        let filteredData = result.data || []
        
        // Apply client-side search filter
        if (filters.search) {
          filteredData = filteredData.filter((sample: SampleData) =>
            sample.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            sample.description.toLowerCase().includes(filters.search.toLowerCase()) ||
            sample.tags.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()))
          )
        }
        
        setSampleData(filteredData)
      }
      
    } catch (error) {
      console.error('Error loading sample data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load sample data')
    } finally {
      setIsLoading(false)
    }
  }

  const getRiskColor = (risk: 'Low' | 'Medium' | 'High') => {
    switch (risk) {
      case 'Low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'High':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getComputationTypeColor = (type: 'third_party' | 'zk' | 'fhe') => {
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

  const formatComputationType = (type: 'third_party' | 'zk' | 'fhe') => {
    switch (type) {
      case 'third_party': return 'Third Party'
      case 'zk': return 'Zero Knowledge'
      case 'fhe': return 'FHE'
      default: return type
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {showPublicOnly ? 'Public Sample Data' : 'Sample Health Data Explorer'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {showPublicOnly 
            ? 'Explore the public health sample data for algorithm development'
            : 'Browse synthetic health screening records for algorithm development and testing'
          }
        </p>
      </div>

      {/* Filters */}
      {!showPublicOnly && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="Search records..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Computation Type Filter */}
            <div>
              <select
                value={filters.computationType}
                onChange={(e) => setFilters(prev => ({ ...prev, computationType: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Computation Types</option>
                <option value="third_party">Third Party</option>
                <option value="zk">Zero Knowledge</option>
                <option value="fhe">FHE</option>
              </select>
            </div>

            {/* Tags Filter */}
            <div>
              <input
                type="text"
                placeholder="Filter by tags (e.g., health,male)"
                value={filters.tags}
                onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Loading sample data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-red-800 dark:text-red-300">{error}</p>
              <button
                onClick={loadSampleData}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
              >
                Try again
              </button>
            </div>
          </div>
        ) : sampleData.length === 0 ? (
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
              No sample data found
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Run <code>npm run data:generate-json</code> to generate synthetic health data
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sampleData.map((sample) => (
              <div
                key={sample.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedRecord(sample)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                      {sample.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {sample.description}
                    </p>
                    
                    {/* Health Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Age/Gender:</span>
                        <span className="ml-1 font-medium">{sample.data.personalInfo.age} / {sample.data.personalInfo.gender}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">BMI:</span>
                        <span className="ml-1 font-medium">{sample.data.personalInfo.bmi}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">BP:</span>
                        <span className="ml-1 font-medium">{sample.data.vitalSigns.systolicBP}/{sample.data.vitalSigns.diastolicBP}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Health Score:</span>
                        <span className="ml-1 font-medium">{sample.data.riskAssessment.overallHealthScore}/10</span>
                      </div>
                    </div>

                    {/* Risk Assessment */}
                    <div className="flex items-center gap-3 mt-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(sample.data.riskAssessment.cardiovascularRisk)}`}>
                        CV: {sample.data.riskAssessment.cardiovascularRisk}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(sample.data.riskAssessment.diabetesRisk)}`}>
                        Diabetes: {sample.data.riskAssessment.diabetesRisk}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sample.privacy_level === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {sample.privacy_level}
                      </span>
                    </div>

                    {/* Computation Types */}
                    <div className="flex items-center gap-2 mt-2">
                      {sample.computation_types.map((type) => (
                        <span
                          key={type}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getComputationTypeColor(type)}`}
                        >
                          {formatComputationType(type)}
                        </span>
                      ))}
                    </div>

                    {/* Tags */}
                    {sample.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {sample.tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                          >
                            {tag}
                          </span>
                        ))}
                        {sample.tags.length > 5 && (
                          <span className="text-xs text-gray-400">+{sample.tags.length - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right text-xs text-gray-500 dark:text-gray-400 ml-4">
                    <p>Schema: {sample.schema}</p>
                    <p>Created: {new Date(sample.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Health Record Details
              </h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              {/* Personal Info */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Personal Information</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-gray-500">Name:</span> {selectedRecord.data.personalInfo.name}</div>
                  <div><span className="text-gray-500">Age:</span> {selectedRecord.data.personalInfo.age} years</div>
                  <div><span className="text-gray-500">Gender:</span> {selectedRecord.data.personalInfo.gender}</div>
                  <div><span className="text-gray-500">Height:</span> {selectedRecord.data.personalInfo.height} cm</div>
                  <div><span className="text-gray-500">Weight:</span> {selectedRecord.data.personalInfo.weight} kg</div>
                  <div><span className="text-gray-500">BMI:</span> {selectedRecord.data.personalInfo.bmi}</div>
                </div>
              </div>

              {/* Vital Signs */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Vital Signs</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-gray-500">Blood Pressure:</span> {selectedRecord.data.vitalSigns.systolicBP}/{selectedRecord.data.vitalSigns.diastolicBP} mmHg</div>
                  <div><span className="text-gray-500">Heart Rate:</span> {selectedRecord.data.vitalSigns.heartRate} BPM</div>
                  <div><span className="text-gray-500">Temperature:</span> {selectedRecord.data.vitalSigns.temperature}°C</div>
                  <div><span className="text-gray-500">Waist:</span> {selectedRecord.data.vitalSigns.waistCircumference} cm</div>
                  <div><span className="text-gray-500">Hip:</span> {selectedRecord.data.vitalSigns.hipCircumference} cm</div>
                  <div><span className="text-gray-500">Waist-Hip Ratio:</span> {selectedRecord.data.vitalSigns.waistHipRatio}</div>
                </div>
              </div>

              {/* Blood Work */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Blood Work</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-gray-500">Total Cholesterol:</span> {selectedRecord.data.bloodWork.totalCholesterol} mg/dL</div>
                  <div><span className="text-gray-500">LDL:</span> {selectedRecord.data.bloodWork.ldlCholesterol} mg/dL</div>
                  <div><span className="text-gray-500">HDL:</span> {selectedRecord.data.bloodWork.hdlCholesterol} mg/dL</div>
                  <div><span className="text-gray-500">Triglycerides:</span> {selectedRecord.data.bloodWork.triglycerides} mg/dL</div>
                  <div><span className="text-gray-500">Glucose:</span> {selectedRecord.data.bloodWork.glucose} mg/dL</div>
                  <div><span className="text-gray-500">HbA1c:</span> {selectedRecord.data.bloodWork.hba1c}%</div>
                </div>
              </div>

              {/* Risk Assessment */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Risk Assessment</h4>
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(selectedRecord.data.riskAssessment.cardiovascularRisk)}`}>
                    Cardiovascular Risk: {selectedRecord.data.riskAssessment.cardiovascularRisk}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(selectedRecord.data.riskAssessment.diabetesRisk)}`}>
                    Diabetes Risk: {selectedRecord.data.riskAssessment.diabetesRisk}
                  </span>
                  <span className="text-sm">
                    <span className="text-gray-500">Overall Health Score:</span> {selectedRecord.data.riskAssessment.overallHealthScore}/10
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {!isLoading && !error && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {sampleData.length} sample record{sampleData.length !== 1 ? 's' : ''}
            {showPublicOnly ? ' (public data only)' : ''}
          </p>
        </div>
      )}
    </div>
  )
}