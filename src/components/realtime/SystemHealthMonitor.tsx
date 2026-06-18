'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useWebSocket } from './WebSocketManager'
import { useAccount } from 'wagmi'

interface SystemHealth {
  overall: HealthStatus
  components: HealthComponent[]
  metrics: SystemMetrics
  alerts: HealthAlert[]
  uptime: number
  lastUpdate: Date
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'partial_outage' | 'major_outage' | 'unknown'
  score: number
  description: string
}

interface HealthComponent {
  id: string
  name: string
  type: 'core' | 'storage' | 'network' | 'security' | 'external'
  status: HealthStatus['status']
  responseTime?: number
  uptime: number
  lastCheck: Date
  dependencies: string[]
  metrics: ComponentMetrics
  incidents: ComponentIncident[]
  configuration: ComponentConfig
}

interface ComponentMetrics {
  availability: number
  performance: number
  errorRate: number
  throughput: number
  latency: number
  resourceUsage: {
    cpu: number
    memory: number
    disk: number
    network: number
  }
}

interface ComponentIncident {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  title: string
  description: string
  startTime: Date
  endTime?: Date
  impact: string[]
  updates: IncidentUpdate[]
}

interface IncidentUpdate {
  id: string
  timestamp: Date
  status: ComponentIncident['status']
  message: string
  author: string
}

interface ComponentConfig {
  enabled: boolean
  criticalPath: boolean
  monitoringInterval: number
  alertThresholds: {
    responseTime: number
    errorRate: number
    availability: number
  }
}

interface SystemMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  throughputPerSecond: number
  activeUsers: number
  totalUsers: number
  dataProcessed: number
  computationsCompleted: number
  networkLatency: number
  storageUsage: number
  bandwidthUsage: number
}

interface HealthAlert {
  id: string
  componentId?: string
  type: 'performance' | 'availability' | 'security' | 'capacity' | 'dependency'
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
  acknowledgedBy?: string
  metadata: Record<string, any>
}

interface SystemHealthMonitorProps {
  refreshInterval?: number
  alertThresholds?: {
    responseTime: number
    errorRate: number
    availability: number
  }
  onHealthChange?: (health: SystemHealth) => void
  onAlertTriggered?: (alert: HealthAlert) => void
}

export function SystemHealthMonitor({
  refreshInterval = 30000,
  alertThresholds = {
    responseTime: 1000,
    errorRate: 5,
    availability: 99.0
  },
  onHealthChange,
  onAlertTriggered
}: SystemHealthMonitorProps) {
  const { address } = useAccount()
  const { connectionStatus, sendMessage, subscribe } = useWebSocket()
  
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall: {
      status: 'unknown',
      score: 0,
      description: 'Loading system status...'
    },
    components: [],
    metrics: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      throughputPerSecond: 0,
      activeUsers: 0,
      totalUsers: 0,
      dataProcessed: 0,
      computationsCompleted: 0,
      networkLatency: 0,
      storageUsage: 0,
      bandwidthUsage: 0
    },
    alerts: [],
    uptime: 0,
    lastUpdate: new Date()
  })
  
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [showIncidents, setShowIncidents] = useState(false)
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')

  // Mock system health data
  useEffect(() => {
    const mockHealth: SystemHealth = {
      overall: {
        status: 'healthy',
        score: 96.8,
        description: 'All systems operational'
      },
      components: [
        {
          id: 'smpc_engine',
          name: 'SMPC Engine',
          type: 'core',
          status: 'healthy',
          responseTime: 245,
          uptime: 99.95,
          lastCheck: new Date(Date.now() - 30 * 1000),
          dependencies: ['crypto_service', 'storage_service'],
          metrics: {
            availability: 99.95,
            performance: 97.2,
            errorRate: 0.05,
            throughput: 1250,
            latency: 245,
            resourceUsage: { cpu: 45, memory: 68, disk: 23, network: 34 }
          },
          incidents: [],
          configuration: {
            enabled: true,
            criticalPath: true,
            monitoringInterval: 30000,
            alertThresholds: { responseTime: 500, errorRate: 1, availability: 99.5 }
          }
        },
        {
          id: 'crypto_service',
          name: 'Cryptography Service',
          type: 'security',
          status: 'healthy',
          responseTime: 156,
          uptime: 99.87,
          lastCheck: new Date(Date.now() - 25 * 1000),
          dependencies: [],
          metrics: {
            availability: 99.87,
            performance: 94.8,
            errorRate: 0.13,
            throughput: 2800,
            latency: 156,
            resourceUsage: { cpu: 78, memory: 42, disk: 12, network: 89 }
          },
          incidents: [],
          configuration: {
            enabled: true,
            criticalPath: true,
            monitoringInterval: 15000,
            alertThresholds: { responseTime: 300, errorRate: 0.5, availability: 99.8 }
          }
        },
        {
          id: 'blockchain_gateway',
          name: 'Blockchain Gateway',
          type: 'external',
          status: 'degraded',
          responseTime: 1245,
          uptime: 97.3,
          lastCheck: new Date(Date.now() - 45 * 1000),
          dependencies: ['network_service'],
          metrics: {
            availability: 97.3,
            performance: 78.5,
            errorRate: 2.7,
            throughput: 450,
            latency: 1245,
            resourceUsage: { cpu: 23, memory: 34, disk: 8, network: 95 }
          },
          incidents: [
            {
              id: 'inc_001',
              severity: 'medium',
              status: 'monitoring',
              title: 'Elevated Response Times',
              description: 'Blockchain gateway experiencing higher than normal response times',
              startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
              impact: ['transaction_delays', 'verification_slower'],
              updates: [
                {
                  id: 'update_001',
                  timestamp: new Date(Date.now() - 30 * 60 * 1000),
                  status: 'monitoring',
                  message: 'Issue identified with external blockchain node. Monitoring for improvement.',
                  author: 'System Monitor'
                }
              ]
            }
          ],
          configuration: {
            enabled: true,
            criticalPath: false,
            monitoringInterval: 60000,
            alertThresholds: { responseTime: 1000, errorRate: 2, availability: 98 }
          }
        },
        {
          id: 'storage_service',
          name: 'Distributed Storage',
          type: 'storage',
          status: 'healthy',
          responseTime: 89,
          uptime: 99.99,
          lastCheck: new Date(Date.now() - 20 * 1000),
          dependencies: [],
          metrics: {
            availability: 99.99,
            performance: 98.7,
            errorRate: 0.01,
            throughput: 5600,
            latency: 89,
            resourceUsage: { cpu: 12, memory: 89, disk: 67, network: 45 }
          },
          incidents: [],
          configuration: {
            enabled: true,
            criticalPath: true,
            monitoringInterval: 30000,
            alertThresholds: { responseTime: 200, errorRate: 0.1, availability: 99.9 }
          }
        },
        {
          id: 'api_gateway',
          name: 'API Gateway',
          type: 'network',
          status: 'healthy',
          responseTime: 67,
          uptime: 99.92,
          lastCheck: new Date(Date.now() - 15 * 1000),
          dependencies: ['rate_limiter'],
          metrics: {
            availability: 99.92,
            performance: 96.4,
            errorRate: 0.08,
            throughput: 8900,
            latency: 67,
            resourceUsage: { cpu: 34, memory: 23, disk: 5, network: 78 }
          },
          incidents: [],
          configuration: {
            enabled: true,
            criticalPath: true,
            monitoringInterval: 15000,
            alertThresholds: { responseTime: 150, errorRate: 0.5, availability: 99.5 }
          }
        }
      ],
      metrics: {
        totalRequests: 1247892,
        successfulRequests: 1243156,
        failedRequests: 4736,
        averageResponseTime: 234,
        p95ResponseTime: 567,
        p99ResponseTime: 1245,
        throughputPerSecond: 145.7,
        activeUsers: 234,
        totalUsers: 5678,
        dataProcessed: 456.7,
        computationsCompleted: 1892,
        networkLatency: 34,
        storageUsage: 67.8,
        bandwidthUsage: 23.4
      },
      alerts: [
        {
          id: 'alert_001',
          componentId: 'blockchain_gateway',
          type: 'performance',
          severity: 'warning',
          title: 'High Response Time',
          message: 'Blockchain gateway response time exceeded threshold (1245ms > 1000ms)',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          resolved: false,
          metadata: {
            threshold: 1000,
            actual: 1245,
            component: 'blockchain_gateway'
          }
        },
        {
          id: 'alert_002',
          type: 'capacity',
          severity: 'info',
          title: 'Storage Usage Alert',
          message: 'Distributed storage usage is at 67.8%',
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          resolved: true,
          resolvedAt: new Date(Date.now() - 30 * 60 * 1000),
          metadata: {
            usage: 67.8,
            threshold: 70
          }
        }
      ],
      uptime: 99.87,
      lastUpdate: new Date()
    }

    setSystemHealth(mockHealth)
  }, [])

  // Subscribe to health updates
  useEffect(() => {
    const unsubscribe = subscribe('system_health', (message) => {
      const healthUpdate = message.payload as Partial<SystemHealth>
      setSystemHealth(prev => ({ ...prev, ...healthUpdate, lastUpdate: new Date() }))
      onHealthChange?.(systemHealth)
    })

    return unsubscribe
  }, [subscribe, systemHealth, onHealthChange])

  // Subscribe to health alerts
  useEffect(() => {
    const unsubscribe = subscribe('health_alert', (message) => {
      const alert = message.payload as HealthAlert
      
      setSystemHealth(prev => ({
        ...prev,
        alerts: [alert, ...prev.alerts.slice(0, 99)]
      }))
      
      onAlertTriggered?.(alert)
    })

    return unsubscribe
  }, [subscribe, onAlertTriggered])

  // Auto-refresh system health
  useEffect(() => {
    if (!connectionStatus.connected) return

    const interval = setInterval(() => {
      sendMessage('get_system_health', { includeMetrics: true })
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [connectionStatus.connected, refreshInterval, sendMessage])

  // Calculate overall health score
  const overallHealthScore = useMemo(() => {
    const { components } = systemHealth
    if (components.length === 0) return 0

    const criticalComponents = components.filter(c => c.configuration.criticalPath)
    const totalWeight = criticalComponents.reduce((sum, c) => sum + (c.configuration.criticalPath ? 2 : 1), 0)
    
    const weightedScore = components.reduce((sum, component) => {
      const weight = component.configuration.criticalPath ? 2 : 1
      const componentScore = (component.metrics.availability + component.metrics.performance) / 2
      return sum + (componentScore * weight)
    }, 0)

    return Math.round(weightedScore / totalWeight * 100) / 100
  }, [systemHealth.components])

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    let filtered = systemHealth.alerts

    if (filterSeverity !== 'all') {
      filtered = filtered.filter(alert => alert.severity === filterSeverity)
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [systemHealth.alerts, filterSeverity])

  // Get status color
  const getStatusColor = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-500 bg-green-100 dark:bg-green-900/50'
      case 'degraded': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/50'
      case 'partial_outage': return 'text-orange-500 bg-orange-100 dark:bg-orange-900/50'
      case 'major_outage': return 'text-red-500 bg-red-100 dark:bg-red-900/50'
      case 'unknown': return 'text-gray-500 bg-gray-100 dark:bg-gray-700'
    }
  }

  const getStatusIcon = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'degraded':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'partial_outage':
        return (
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'major_outage':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getSeverityColor = (severity: HealthAlert['severity']) => {
    switch (severity) {
      case 'info': return 'text-blue-500 bg-blue-100 dark:bg-blue-900/50'
      case 'warning': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/50'
      case 'error': return 'text-red-500 bg-red-100 dark:bg-red-900/50'
      case 'critical': return 'text-red-600 bg-red-200 dark:bg-red-900/70'
    }
  }

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const selectedComp = selectedComponent ? systemHealth.components.find(c => c.id === selectedComponent) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Health Monitor</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time system health and performance monitoring • Last updated: {systemHealth.lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {getStatusIcon(systemHealth.overall.status)}
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(systemHealth.overall.status)}`}>
              {systemHealth.overall.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {overallHealthScore}%
            </div>
            <div className="text-xs text-gray-500">Health Score</div>
          </div>
        </div>
      </div>

      {/* Overall Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {systemHealth.metrics.throughputPerSecond.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Requests/sec</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
              {formatUptime(systemHealth.uptime)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              {systemHealth.metrics.averageResponseTime}ms
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Response</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
              {systemHealth.metrics.activeUsers}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Users</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Components Status */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">System Components</h3>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {systemHealth.components.map(component => (
                <div
                  key={component.id}
                  className={`p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    selectedComponent === component.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => setSelectedComponent(selectedComponent === component.id ? null : component.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(component.status)}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {component.name}
                          {component.configuration.criticalPath && (
                            <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 text-xs font-medium rounded">
                              Critical
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {component.type} • Last check: {formatDuration(Date.now() - component.lastCheck.getTime())} ago
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(component.status)}`}>
                        {component.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Uptime:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {formatUptime(component.uptime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Response:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {component.responseTime}ms
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Error Rate:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {component.metrics.errorRate.toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">CPU:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {component.metrics.resourceUsage.cpu}%
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedComponent === component.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-3">Resource Usage</h5>
                          <div className="space-y-2">
                            {Object.entries(component.metrics.resourceUsage).map(([resource, usage]) => (
                              <div key={resource}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-gray-600 dark:text-gray-400 capitalize">{resource}:</span>
                                  <span className="font-medium text-gray-900 dark:text-white">{usage}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      usage > 80 ? 'bg-red-500' :
                                      usage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${usage}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-3">Dependencies</h5>
                          {component.dependencies.length > 0 ? (
                            <div className="space-y-1">
                              {component.dependencies.map(dep => (
                                <div key={dep} className="text-sm text-gray-600 dark:text-gray-400">
                                  • {dep}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">No dependencies</div>
                          )}
                        </div>
                      </div>

                      {/* Active Incidents */}
                      {component.incidents.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <h5 className="font-medium text-gray-900 dark:text-white mb-3">Active Incidents</h5>
                          <div className="space-y-3">
                            {component.incidents.map(incident => (
                              <div key={incident.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded">
                                <div className="flex items-start justify-between mb-2">
                                  <h6 className="font-medium text-gray-900 dark:text-white text-sm">
                                    {incident.title}
                                  </h6>
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(incident.severity)}`}>
                                    {incident.severity}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {incident.description}
                                </p>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Duration: {formatDuration(Date.now() - incident.startTime.getTime())} • 
                                  Status: {incident.status}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts & Incidents */}
        <div className="space-y-6">
          {/* Recent Alerts */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Recent Alerts ({filteredAlerts.length})
                </h3>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All</option>
                  <option value="critical">Critical</option>
                  <option value="error">Error</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {filteredAlerts.slice(0, 10).map(alert => (
                <div key={alert.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      {alert.title}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {alert.message}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{alert.timestamp.toLocaleTimeString()}</span>
                    <span className={`px-2 py-1 rounded ${
                      alert.resolved ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                    }`}>
                      {alert.resolved ? 'Resolved' : 'Active'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">Performance Metrics</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Success Rate:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {((systemHealth.metrics.successfulRequests / systemHealth.metrics.totalRequests) * 100).toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">P95 Response:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {systemHealth.metrics.p95ResponseTime}ms
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">P99 Response:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {systemHealth.metrics.p99ResponseTime}ms
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Computations:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {systemHealth.metrics.computationsCompleted}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Storage Usage:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {systemHealth.metrics.storageUsage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      systemHealth.metrics.storageUsage > 80 ? 'bg-red-500' :
                      systemHealth.metrics.storageUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${systemHealth.metrics.storageUsage}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Bandwidth Usage:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {systemHealth.metrics.bandwidthUsage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      systemHealth.metrics.bandwidthUsage > 80 ? 'bg-red-500' :
                      systemHealth.metrics.bandwidthUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${systemHealth.metrics.bandwidthUsage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}