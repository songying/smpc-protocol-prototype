'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAccount } from 'wagmi'

interface DatasetSelection {
  id: string
  title: string
  provider: string
  price: number
  size: number
  category: number
  isSelected: boolean
  estimatedCost: number
}

interface ComputationTemplate {
  id: string
  name: string
  description: string
  category: 'statistical' | 'ml' | 'analytics' | 'custom'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: string
  requiredDataTypes: string[]
  parameters: ComputationParameter[]
  script: string
  icon: string
}

interface ComputationParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect'
  description: string
  required: boolean
  defaultValue?: any
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

interface CostBreakdown {
  dataAccessFees: number
  computationFees: number
  networkFees: number
  platformFees: number
  total: number
}

interface ComputationRequestBuilderProps {
  selectedDatasets?: DatasetSelection[]
  onSubmitRequest?: (request: any) => void
  onSaveTemplate?: (template: ComputationTemplate) => void
}

export function ComputationRequestBuilder({ 
  selectedDatasets = [], 
  onSubmitRequest, 
  onSaveTemplate 
}: ComputationRequestBuilderProps) {
  const { address } = useAccount()
  
  const [activeTab, setActiveTab] = useState<'builder' | 'code' | 'preview'>('builder')
  const [selectedTemplate, setSelectedTemplate] = useState<ComputationTemplate | null>(null)
  const [datasets, setDatasets] = useState<DatasetSelection[]>(selectedDatasets)
  const [computationScript, setComputationScript] = useState('')
  const [parameters, setParameters] = useState<Record<string, any>>({})
  const [estimatedCost, setEstimatedCost] = useState<CostBreakdown>({
    dataAccessFees: 0,
    computationFees: 0,
    networkFees: 0,
    platformFees: 0,
    total: 0
  })
  const [customParameters, setCustomParameters] = useState<ComputationParameter[]>([])

  // Mock computation templates
  const templates: ComputationTemplate[] = [
    {
      id: 'statistical-summary',
      name: 'Statistical Summary',
      description: 'Calculate basic statistics (mean, median, std dev) across multiple datasets',
      category: 'statistical',
      difficulty: 'beginner',
      estimatedTime: '5-10 minutes',
      requiredDataTypes: ['numerical'],
      icon: '📊',
      parameters: [
        {
          name: 'columns',
          type: 'multiselect',
          description: 'Select columns for statistical analysis',
          required: true,
          options: ['all', 'numerical_only', 'custom']
        },
        {
          name: 'precision',
          type: 'number',
          description: 'Decimal precision for results',
          required: false,
          defaultValue: 4,
          validation: { min: 1, max: 10 }
        }
      ],
      script: `
// Statistical Summary Computation
function computeStatistics(datasets, columns, precision = 4) {
  const results = {};
  
  datasets.forEach((dataset, index) => {
    const stats = {
      mean: dataset.mean(columns),
      median: dataset.median(columns),
      stdDev: dataset.standardDeviation(columns),
      min: dataset.min(columns),
      max: dataset.max(columns)
    };
    
    results[\`dataset_\${index + 1}\`] = stats;
  });
  
  return results;
}
      `
    },
    {
      id: 'correlation-analysis',
      name: 'Correlation Analysis',
      description: 'Compute correlations between datasets while preserving privacy',
      category: 'statistical',
      difficulty: 'intermediate',
      estimatedTime: '10-20 minutes',
      requiredDataTypes: ['numerical'],
      icon: '📈',
      parameters: [
        {
          name: 'method',
          type: 'select',
          description: 'Correlation method',
          required: true,
          options: ['pearson', 'spearman', 'kendall'],
          defaultValue: 'pearson'
        },
        {
          name: 'threshold',
          type: 'number',
          description: 'Significance threshold',
          required: false,
          defaultValue: 0.05,
          validation: { min: 0.01, max: 0.1 }
        }
      ],
      script: `
// Correlation Analysis
function computeCorrelation(datasets, method = 'pearson', threshold = 0.05) {
  const correlationMatrix = [];
  
  for (let i = 0; i < datasets.length; i++) {
    for (let j = i + 1; j < datasets.length; j++) {
      const correlation = calculateCorrelation(
        datasets[i], 
        datasets[j], 
        method
      );
      
      if (Math.abs(correlation.value) > threshold) {
        correlationMatrix.push({
          dataset1: i,
          dataset2: j,
          correlation: correlation.value,
          pValue: correlation.pValue
        });
      }
    }
  }
  
  return correlationMatrix;
}
      `
    },
    {
      id: 'ml-training',
      name: 'Federated ML Training',
      description: 'Train machine learning models across multiple datasets',
      category: 'ml',
      difficulty: 'advanced',
      estimatedTime: '30-60 minutes',
      requiredDataTypes: ['numerical', 'categorical'],
      icon: '🤖',
      parameters: [
        {
          name: 'algorithm',
          type: 'select',
          description: 'ML algorithm to use',
          required: true,
          options: ['linear_regression', 'logistic_regression', 'random_forest', 'neural_network']
        },
        {
          name: 'epochs',
          type: 'number',
          description: 'Training epochs',
          required: true,
          defaultValue: 100,
          validation: { min: 10, max: 1000 }
        },
        {
          name: 'learning_rate',
          type: 'number',
          description: 'Learning rate',
          required: false,
          defaultValue: 0.01,
          validation: { min: 0.001, max: 1.0 }
        }
      ],
      script: `
// Federated ML Training
function trainFederatedModel(datasets, algorithm, epochs = 100, learningRate = 0.01) {
  const model = initializeModel(algorithm);
  
  for (let epoch = 0; epoch < epochs; epoch++) {
    const localUpdates = [];
    
    datasets.forEach(dataset => {
      const localModel = model.clone();
      const update = localModel.train(dataset, learningRate);
      localUpdates.push(update);
    });
    
    // Aggregate updates using secure aggregation
    model.updateWeights(aggregateUpdates(localUpdates));
  }
  
  return {
    model: model.export(),
    metrics: model.getMetrics(),
    convergence: model.hasConverged()
  };
}
      `
    }
  ]

  // Calculate cost when datasets or parameters change
  useEffect(() => {
    calculateCost()
  }, [datasets, parameters, selectedTemplate])

  const calculateCost = () => {
    const baseDataFee = datasets.reduce((sum, dataset) => 
      dataset.isSelected ? sum + dataset.price : sum, 0
    )
    
    const computationComplexity = selectedTemplate ? 
      (selectedTemplate.difficulty === 'beginner' ? 1 : 
       selectedTemplate.difficulty === 'intermediate' ? 2 : 3) : 1
    
    const dataSize = datasets.reduce((sum, dataset) => 
      dataset.isSelected ? sum + dataset.size : sum, 0
    )
    
    const computationFees = (dataSize / 1000000) * 0.001 * computationComplexity // 0.001 ETH per MB
    const networkFees = 0.005 // Fixed network fee
    const platformFees = (baseDataFee + computationFees) * 0.025 // 2.5% platform fee
    
    const total = baseDataFee + computationFees + networkFees + platformFees
    
    setEstimatedCost({
      dataAccessFees: baseDataFee,
      computationFees,
      networkFees,
      platformFees,
      total
    })
  }

  const handleTemplateSelect = (template: ComputationTemplate) => {
    setSelectedTemplate(template)
    setComputationScript(template.script)
    
    // Initialize parameters with default values
    const initialParams: Record<string, any> = {}
    template.parameters.forEach(param => {
      if (param.defaultValue !== undefined) {
        initialParams[param.name] = param.defaultValue
      }
    })
    setParameters(initialParams)
  }

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({ ...prev, [paramName]: value }))
  }

  const toggleDatasetSelection = (datasetId: string) => {
    setDatasets(prev => prev.map(dataset => 
      dataset.id === datasetId 
        ? { ...dataset, isSelected: !dataset.isSelected }
        : dataset
    ))
  }

  const renderParameterInput = (param: ComputationParameter) => {
    const value = parameters[param.name] || param.defaultValue

    switch (param.type) {
      case 'string':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder={param.description}
          />
        )
      
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value) || 0)}
            min={param.validation?.min}
            max={param.validation?.max}
            step="any"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        )
      
      case 'boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleParameterChange(param.name, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{param.description}</span>
          </label>
        )
      
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Select {param.name}</option>
            {param.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )
      
      case 'multiselect':
        return (
          <div className="space-y-2">
            {param.options?.map(option => (
              <label key={option} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(value || []).includes(option)}
                  onChange={(e) => {
                    const currentValues = value || []
                    const newValues = e.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter((v: string) => v !== option)
                    handleParameterChange(param.name, newValues)
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        )
      
      default:
        return null
    }
  }

  const handleSubmitRequest = () => {
    const selectedDatasetsList = datasets.filter(d => d.isSelected)
    
    if (selectedDatasetsList.length === 0) {
      alert('Please select at least one dataset')
      return
    }
    
    if (!selectedTemplate && !computationScript.trim()) {
      alert('Please select a template or write custom computation script')
      return
    }

    const request = {
      datasets: selectedDatasetsList.map(d => d.id),
      template: selectedTemplate?.id,
      script: computationScript,
      parameters,
      estimatedCost,
      timestamp: new Date(),
      requester: address
    }

    onSubmitRequest?.(request)
  }

  const getDifficultyColor = (difficulty: ComputationTemplate['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Computation Request Builder</h2>
          <p className="text-gray-600 dark:text-gray-400">Build and configure your SMPC computation request</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dataset Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Select Datasets</h3>
            
            {datasets.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400">No datasets added. Go to Data Discovery to add datasets.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {datasets.map(dataset => (
                  <div
                    key={dataset.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      dataset.isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => toggleDatasetSelection(dataset.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={dataset.isSelected}
                          onChange={() => toggleDatasetSelection(dataset.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{dataset.title}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">by {dataset.provider}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">{dataset.price} ETH</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {(dataset.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Template Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Computation Templates</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {templates.map(template => (
                <div
                  key={template.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{template.name}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(template.difficulty)}`}>
                          {template.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{template.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">⏱️ {template.estimatedTime}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Script Option */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="flex items-center space-x-2 mb-3">
                <input
                  type="radio"
                  name="computation-type"
                  checked={!selectedTemplate}
                  onChange={() => setSelectedTemplate(null)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-900 dark:text-white">Custom Script</span>
              </label>
              
              {!selectedTemplate && (
                <textarea
                  value={computationScript}
                  onChange={(e) => setComputationScript(e.target.value)}
                  placeholder="Write your custom SMPC computation script here..."
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
                />
              )}
            </div>
          </div>

          {/* Parameters Configuration */}
          {selectedTemplate && selectedTemplate.parameters.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Parameters</h3>
              
              <div className="space-y-4">
                {selectedTemplate.parameters.map(param => (
                  <div key={param.name}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {param.name}
                      {param.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{param.description}</p>
                    {renderParameterInput(param)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Navigation for Code/Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6">
                {(['builder', 'code', 'preview'] as const).map(tab => (
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
              {activeTab === 'code' && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Computation Script</h4>
                  <textarea
                    value={computationScript}
                    onChange={(e) => setComputationScript(e.target.value)}
                    rows={20}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm"
                    readOnly={!!selectedTemplate}
                  />
                </div>
              )}

              {activeTab === 'preview' && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Request Preview</h4>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {JSON.stringify({
                        datasets: datasets.filter(d => d.isSelected).map(d => ({
                          id: d.id,
                          title: d.title,
                          provider: d.provider
                        })),
                        template: selectedTemplate?.name || 'Custom Script',
                        parameters,
                        estimatedCost
                      }, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Cost Calculator & Actions */}
        <div className="space-y-6">
          {/* Cost Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Cost Estimate</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Data Access</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {estimatedCost.dataAccessFees.toFixed(4)} ETH
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Computation</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {estimatedCost.computationFees.toFixed(4)} ETH
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Network Fees</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {estimatedCost.networkFees.toFixed(4)} ETH
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Platform Fee</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {estimatedCost.platformFees.toFixed(4)} ETH
                </span>
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">Total</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {estimatedCost.total.toFixed(4)} ETH
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Request Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Request Summary</h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Selected Datasets:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {datasets.filter(d => d.isSelected).length}
                </span>
              </div>
              
              <div>
                <span className="text-gray-600 dark:text-gray-400">Computation Type:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {selectedTemplate ? selectedTemplate.name : 'Custom Script'}
                </span>
              </div>
              
              {selectedTemplate && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Estimated Time:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {selectedTemplate.estimatedTime}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleSubmitRequest}
              disabled={datasets.filter(d => d.isSelected).length === 0 || (!selectedTemplate && !computationScript.trim())}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Submit Request
            </button>
            
            <button
              onClick={() => onSaveTemplate?.(selectedTemplate!)}
              disabled={!selectedTemplate}
              className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Save Template
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}