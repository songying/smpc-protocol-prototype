'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useWebSocket } from './WebSocketManager'
import { useAccount } from 'wagmi'

interface ComputationStatus {
  id: string
  requestId: string
  title: string
  status: 'queued' | 'initializing' | 'computing' | 'aggregating' | 'verifying' | 'completed' | 'failed' | 'cancelled'
  progress: number
  stage: ComputationStage
  startTime: Date
  estimatedCompletion?: Date
  actualCompletion?: Date
  participants: ParticipantStatus[]
  resources: ResourceUsage
  logs: ComputationLog[]
  error?: ComputationError
  metrics: ComputationMetrics
}

interface ComputationStage {
  name: string
  description: string
  progress: number
  startTime: Date
  endTime?: Date
  status: 'pending' | 'active' | 'completed' | 'failed'
  details: Record<string, any>
}

interface ParticipantStatus {
  id: string
  address: string
  name: string
  role: 'data_provider' | 'auditor' | 'consumer' | 'compute_node'
  status: 'offline' | 'online' | 'computing' | 'completed' | 'error'
  contribution: number
  lastActivity: Date
  resources: {
    cpu: number
    memory: number
    network: number
  }
}

interface ResourceUsage {
  cpu: {
    current: number
    average: number
    peak: number
  }
  memory: {
    current: number
    average: number
    peak: number
    unit: 'MB' | 'GB'
  }
  network: {
    bytesIn: number
    bytesOut: number
    latency: number
  }
  storage: {
    used: number
    available: number
    unit: 'MB' | 'GB'
  }
}

interface ComputationLog {
  id: string
  timestamp: Date
  level: 'debug' | 'info' | 'warning' | 'error'
  source: string
  message: string
  details?: any
}

interface ComputationError {
  code: string
  message: string
  timestamp: Date
  source: string
  recoverable: boolean
  details: any
}

interface ComputationMetrics {
  totalOperations: number
  operationsPerSecond: number
  dataProcessed: number
  encryptionOverhead: number
  networkLatency: number
  accuracyScore?: number
  privacyScore: number
}

interface ComputationTrackerProps {
  computationId?: string
  onStatusChange?: (status: ComputationStatus) => void
  autoRefresh?: boolean
  refreshInterval?: number
}

export function ComputationTracker({
  computationId,
  onStatusChange,
  autoRefresh = true,
  refreshInterval = 5000
}: ComputationTrackerProps) {
  const { address } = useAccount()
  const { connectionStatus, sendMessage, subscribe } = useWebSocket()
  
  const [computations, setComputations] = useState<Map<string, ComputationStatus>>(new Map())
  const [selectedComputation, setSelectedComputation] = useState<string | null>(computationId || null)
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'logs' | 'participants'>('overview')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'startTime' | 'progress' | 'status'>('startTime')

  // Mock initial computations - in real app this would come from WebSocket
  useEffect(() => {
    const mockComputations: ComputationStatus[] = [
      {
        id: 'comp_001',
        requestId: 'req_audit_001',
        title: 'Medical AI Training - Cardiovascular Risk Assessment',
        status: 'computing',
        progress: 65,
        stage: {
          name: 'Federated Training',
          description: 'Training ML model across distributed datasets',
          progress: 65,
          startTime: new Date(Date.now() - 15 * 60 * 1000),
          status: 'active',
          details: {
            epoch: 65,
            totalEpochs: 100,
            loss: 0.234,
            accuracy: 0.847
          }
        },
        startTime: new Date(Date.now() - 20 * 60 * 1000),
        estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000),
        participants: [
          {
            id: 'p1',
            address: '0x123456...789',
            name: 'MedData Research',
            role: 'data_provider',
            status: 'computing',
            contribution: 35.2,
            lastActivity: new Date(Date.now() - 30 * 1000),
            resources: { cpu: 78, memory: 65, network: 23 }
          },
          {
            id: 'p2',
            address: '0x987654...321',
            name: 'Compute Node Alpha',
            role: 'compute_node',
            status: 'computing',
            contribution: 89.1,
            lastActivity: new Date(Date.now() - 15 * 1000),
            resources: { cpu: 92, memory: 84, network: 45 }
          }
        ],
        resources: {
          cpu: { current: 85, average: 78, peak: 95 },
          memory: { current: 12.4, average: 10.8, peak: 15.2, unit: 'GB' },
          network: { bytesIn: 1250000000, bytesOut: 890000000, latency: 45 },
          storage: { used: 4.2, available: 15.8, unit: 'GB' }
        },
        logs: [
          {
            id: 'log1',
            timestamp: new Date(Date.now() - 2 * 60 * 1000),
            level: 'info',
            source: 'ML_ENGINE',
            message: 'Epoch 65/100 completed with accuracy: 84.7%'
          },
          {
            id: 'log2',
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            level: 'info',
            source: 'AGGREGATOR',
            message: 'Received gradient updates from 2/2 participants'
          },
          {
            id: 'log3',
            timestamp: new Date(Date.now() - 8 * 60 * 1000),
            level: 'warning',
            source: 'NETWORK',
            message: 'High latency detected on participant p1 connection'
          }
        ],
        metrics: {
          totalOperations: 6500000,
          operationsPerSecond: 1250,
          dataProcessed: 2.4,
          encryptionOverhead: 15.7,
          networkLatency: 45,
          accuracyScore: 84.7,
          privacyScore: 98.2
        }
      },
      {
        id: 'comp_002',
        requestId: 'req_audit_002',
        title: 'E-commerce Analytics - Customer Behavior Study',
        status: 'aggregating',
        progress: 85,
        stage: {
          name: 'Secure Aggregation',
          description: 'Aggregating encrypted results from all participants',
          progress: 85,
          startTime: new Date(Date.now() - 5 * 60 * 1000),
          status: 'active',
          details: {
            aggregatedResults: 8,
            totalResults: 10,
            verificationsPending: 2
          }
        },
        startTime: new Date(Date.now() - 35 * 60 * 1000),
        estimatedCompletion: new Date(Date.now() + 3 * 60 * 1000),
        participants: [
          {
            id: 'p3',
            address: '0xabc123...def',
            name: 'DataMart Analytics',
            role: 'data_provider',
            status: 'completed',
            contribution: 100,
            lastActivity: new Date(Date.now() - 2 * 60 * 1000),
            resources: { cpu: 15, memory: 20, network: 5 }
          }
        ],
        resources: {
          cpu: { current: 25, average: 45, peak: 78 },
          memory: { current: 3.2, average: 4.8, peak: 7.1, unit: 'GB' },
          network: { bytesIn: 450000000, bytesOut: 320000000, latency: 28 },
          storage: { used: 1.8, available: 18.2, unit: 'GB' }
        },
        logs: [
          {
            id: 'log4',
            timestamp: new Date(Date.now() - 1 * 60 * 1000),
            level: 'info',
            source: 'AGGREGATOR',
            message: 'Aggregation progress: 85% complete'
          }
        ],
        metrics: {
          totalOperations: 2800000,
          operationsPerSecond: 890,
          dataProcessed: 1.2,
          encryptionOverhead: 12.3,
          networkLatency: 28,
          privacyScore: 95.8
        }
      }
    ]

    const computationMap = new Map()
    mockComputations.forEach(comp => computationMap.set(comp.id, comp))
    setComputations(computationMap)

    if (!selectedComputation && mockComputations.length > 0) {
      setSelectedComputation(mockComputations[0].id)
    }
  }, [selectedComputation])

  // Subscribe to computation updates via WebSocket
  useEffect(() => {
    const unsubscribe = subscribe('computation_update', (message) => {
      const update = message.payload as Partial<ComputationStatus> & { id: string }
      
      setComputations(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(update.id)
        
        if (existing) {
          newMap.set(update.id, { ...existing, ...update })
        }
        
        return newMap
      })
    })

    return unsubscribe
  }, [subscribe])

  // Subscribe to computation logs
  useEffect(() => {
    const unsubscribe = subscribe('computation_log', (message) => {
      const { computationId: compId, log } = message.payload
      
      setComputations(prev => {
        const newMap = new Map(prev)
        const computation = newMap.get(compId)
        
        if (computation) {
          newMap.set(compId, {
            ...computation,
            logs: [log, ...computation.logs].slice(0, 100) // Keep last 100 logs
          })
        }
        
        return newMap
      })
    })

    return unsubscribe
  }, [subscribe])

  // Auto-refresh computations
  useEffect(() => {
    if (!autoRefresh || !connectionStatus.connected) return

    const interval = setInterval(() => {
      sendMessage('get_computation_status', {
        computationIds: Array.from(computations.keys()),
        includeMetrics: true
      })
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, connectionStatus.connected, computations, refreshInterval, sendMessage])

  // Notify parent of status changes
  useEffect(() => {
    if (selectedComputation && onStatusChange) {
      const computation = computations.get(selectedComputation)
      if (computation) {
        onStatusChange(computation)
      }
    }
  }, [selectedComputation, computations, onStatusChange])

  // Filter and sort computations
  const filteredComputations = useMemo(() => {
    let filtered = Array.from(computations.values())

    if (filterStatus !== 'all') {
      filtered = filtered.filter(comp => comp.status === filterStatus)
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'startTime':
          return b.startTime.getTime() - a.startTime.getTime()
        case 'progress':
          return b.progress - a.progress
        case 'status':
          return a.status.localeCompare(b.status)
        default:
          return 0
      }
    })

    return filtered
  }, [computations, filterStatus, sortBy])

  const getStatusColor = (status: ComputationStatus['status']) => {
    switch (status) {
      case 'queued': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'initializing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
      case 'computing': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
      case 'aggregating': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
      case 'verifying': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getParticipantStatusColor = (status: ParticipantStatus['status']) => {
    switch (status) {
      case 'offline': return 'text-gray-500'
      case 'online': return 'text-blue-500'
      case 'computing': return 'text-purple-500 animate-pulse'
      case 'completed': return 'text-green-500'
      case 'error': return 'text-red-500'
    }
  }

  const getLogLevelColor = (level: ComputationLog['level']) => {
    switch (level) {
      case 'debug': return 'text-gray-500'
      case 'info': return 'text-blue-500'
      case 'warning': return 'text-yellow-500'
      case 'error': return 'text-red-500'
    }
  }

  const formatDuration = (start: Date, end?: Date) => {
    const duration = (end || new Date()).getTime() - start.getTime()
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const selectedComp = selectedComputation ? computations.get(selectedComputation) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Computation Tracker</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time monitoring of SMPC computations • {filteredComputations.length} active
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="queued">Queued</option>
            <option value="computing">Computing</option>
            <option value="aggregating">Aggregating</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="startTime">Start Time</option>
            <option value="progress">Progress</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Computations List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">Active Computations</h3>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {filteredComputations.map(computation => (
                <div
                  key={computation.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    selectedComputation === computation.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => setSelectedComputation(computation.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      {computation.title}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(computation.status)}`}>
                      {computation.status}
                    </span>
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>{computation.stage.name}</span>
                      <span>{computation.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${computation.progress}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{computation.participants.length} participants</span>
                    <span>{formatDuration(computation.startTime)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed View */}
        <div className="lg:col-span-2">
          {selectedComp ? (
            <div className="space-y-6">
              {/* Overview Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedComp.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>Started: {selectedComp.startTime.toLocaleString()}</span>
                      <span>•</span>
                      <span>Duration: {formatDuration(selectedComp.startTime, selectedComp.actualCompletion)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedComp.status)}`}>
                      {selectedComp.status}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {selectedComp.stage.name}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedComp.progress}% complete
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${selectedComp.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedComp.stage.description}
                  </p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {selectedComp.metrics.operationsPerSecond.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ops/sec</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {selectedComp.metrics.privacyScore.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Privacy</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {formatBytes(selectedComp.metrics.dataProcessed * 1024 * 1024 * 1024)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Data</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {selectedComp.metrics.networkLatency}ms
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Latency</p>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="flex space-x-8 px-6">
                    {(['overview', 'detailed', 'participants', 'logs'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setViewMode(tab)}
                        className={`py-4 text-sm font-medium border-b-2 ${
                          viewMode === tab
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
                  {viewMode === 'overview' && (
                    <div className="space-y-6">
                      {/* Resource Usage */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Resource Usage</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600 dark:text-gray-400">CPU</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {selectedComp.resources.cpu.current}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${selectedComp.resources.cpu.current}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600 dark:text-gray-400">Memory</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {selectedComp.resources.memory.current} {selectedComp.resources.memory.unit}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${(selectedComp.resources.memory.current / selectedComp.resources.memory.peak) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stage Details */}
                      {selectedComp.stage.details && (
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Stage Details</h4>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                              {JSON.stringify(selectedComp.stage.details, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {viewMode === 'participants' && (
                    <div className="space-y-4">
                      {selectedComp.participants.map(participant => (
                        <div key={participant.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h5 className="font-medium text-gray-900 dark:text-white">{participant.name}</h5>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{participant.role}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${getParticipantStatusColor(participant.status).replace('text-', 'bg-')}`} />
                              <span className={`text-sm font-medium ${getParticipantStatusColor(participant.status)}`}>
                                {participant.status}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Contribution:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {participant.contribution.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">CPU:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {participant.resources.cpu}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Last Activity:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {formatDuration(participant.lastActivity)} ago
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {viewMode === 'logs' && (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {selectedComp.logs.map(log => (
                        <div key={log.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded">
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                          <span className={`text-xs font-medium w-16 flex-shrink-0 ${getLogLevelColor(log.level)}`}>
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400 w-24 flex-shrink-0">
                            {log.source}
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white flex-1">
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No computation selected</h3>
              <p className="text-gray-600 dark:text-gray-400">Select a computation from the list to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}