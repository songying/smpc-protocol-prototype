'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useWebSocket } from './WebSocketManager'
import { useAccount } from 'wagmi'

interface DataProvider {
  id: string
  address: string
  name: string
  description: string
  status: 'online' | 'offline' | 'maintenance' | 'degraded' | 'error'
  lastSeen: Date
  uptime: number
  reputation: number
  datasets: ProviderDataset[]
  resources: ProviderResources
  metrics: ProviderMetrics
  compliance: ComplianceStatus
  location: ProviderLocation
  version: string
  features: string[]
}

interface ProviderDataset {
  id: string
  title: string
  category: string
  size: number
  priceETH: number
  status: 'available' | 'processing' | 'unavailable' | 'updating'
  accessCount: number
  lastAccessed?: Date
  quality: {
    completeness: number
    accuracy: number
    freshness: number
  }
}

interface ProviderResources {
  cpu: {
    usage: number
    cores: number
    frequency: number
  }
  memory: {
    used: number
    total: number
    unit: 'MB' | 'GB'
  }
  storage: {
    used: number
    available: number
    total: number
    unit: 'GB' | 'TB'
  }
  network: {
    bandwidth: number
    latency: number
    uplink: number
    downlink: number
  }
}

interface ProviderMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  dataTransferred: number
  revenue: number
  activeConnections: number
  queuedRequests: number
}

interface ComplianceStatus {
  gdpr: 'compliant' | 'partial' | 'non-compliant'
  hipaa: 'compliant' | 'partial' | 'non-compliant'
  ccpa: 'compliant' | 'partial' | 'non-compliant'
  lastAudit: Date
  certifications: string[]
  issues: ComplianceIssue[]
}

interface ComplianceIssue {
  id: string
  type: 'privacy' | 'security' | 'regulatory'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  detected: Date
  resolved: boolean
}

interface ProviderLocation {
  country: string
  region: string
  city: string
  datacenter?: string
  coordinates: {
    lat: number
    lng: number
  }
}

interface ProviderAlert {
  id: string
  providerId: string
  type: 'outage' | 'performance' | 'security' | 'compliance' | 'maintenance'
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  timestamp: Date
  acknowledged: boolean
  resolved: boolean
}

interface DataProviderMonitorProps {
  providerId?: string
  onProviderSelect?: (provider: DataProvider) => void
  onAlertTriggered?: (alert: ProviderAlert) => void
  refreshInterval?: number
}

export function DataProviderMonitor({
  providerId,
  onProviderSelect,
  onAlertTriggered,
  refreshInterval = 10000
}: DataProviderMonitorProps) {
  const { address } = useAccount()
  const { connectionStatus, sendMessage, subscribe } = useWebSocket()
  
  const [providers, setProviders] = useState<Map<string, DataProvider>>(new Map())
  const [selectedProvider, setSelectedProvider] = useState<string | null>(providerId || null)
  const [alerts, setAlerts] = useState<ProviderAlert[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCompliance, setFilterCompliance] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'reputation' | 'uptime'>('reputation')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Mock data - in real app this would come from WebSocket
  useEffect(() => {
    const mockProviders: DataProvider[] = [
      {
        id: 'provider_001',
        address: '0x742d35Cc6C4A1bE45cF0f2e35C5bbA123456789',
        name: 'MedData Research',
        description: 'Specialized medical research data provider with focus on cardiovascular studies',
        status: 'online',
        lastSeen: new Date(Date.now() - 30 * 1000),
        uptime: 99.8,
        reputation: 94.2,
        datasets: [
          {
            id: 'ds_001',
            title: 'Cardiovascular Studies Dataset',
            category: 'Medical',
            size: 52428800,
            priceETH: 2.5,
            status: 'available',
            accessCount: 45,
            lastAccessed: new Date(Date.now() - 2 * 60 * 60 * 1000),
            quality: { completeness: 98, accuracy: 96, freshness: 85 }
          },
          {
            id: 'ds_002',
            title: 'Clinical Trial Data Archive',
            category: 'Medical',
            size: 104857600,
            priceETH: 4.2,
            status: 'available',
            accessCount: 23,
            lastAccessed: new Date(Date.now() - 6 * 60 * 60 * 1000),
            quality: { completeness: 95, accuracy: 98, freshness: 92 }
          }
        ],
        resources: {
          cpu: { usage: 45, cores: 32, frequency: 3200 },
          memory: { used: 24.6, total: 128, unit: 'GB' },
          storage: { used: 2.4, available: 17.6, total: 20, unit: 'TB' },
          network: { bandwidth: 10000, latency: 12, uplink: 1000, downlink: 1000 }
        },
        metrics: {
          totalRequests: 1248,
          successfulRequests: 1231,
          failedRequests: 17,
          averageResponseTime: 45,
          dataTransferred: 15.6,
          revenue: 127.4,
          activeConnections: 8,
          queuedRequests: 2
        },
        compliance: {
          gdpr: 'compliant',
          hipaa: 'compliant',
          ccpa: 'compliant',
          lastAudit: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          certifications: ['ISO 27001', 'SOC 2 Type II', 'HIPAA'],
          issues: []
        },
        location: {
          country: 'United States',
          region: 'California',
          city: 'San Francisco',
          datacenter: 'AWS US-West-1',
          coordinates: { lat: 37.7749, lng: -122.4194 }
        },
        version: '2.1.4',
        features: ['MKFHE', 'Zero-Knowledge', 'Secure Aggregation', 'Differential Privacy']
      },
      {
        id: 'provider_002',
        address: '0x123456789A1bE45cF0f2e35C5bbA742d35Cc6C4',
        name: 'DataMart Analytics',
        description: 'E-commerce and customer analytics data provider',
        status: 'online',
        lastSeen: new Date(Date.now() - 45 * 1000),
        uptime: 97.3,
        reputation: 89.7,
        datasets: [
          {
            id: 'ds_003',
            title: 'E-commerce Customer Behavior',
            category: 'Commercial',
            size: 15728640,
            priceETH: 0.75,
            status: 'available',
            accessCount: 156,
            lastAccessed: new Date(Date.now() - 30 * 60 * 1000),
            quality: { completeness: 95, accuracy: 91, freshness: 88 }
          }
        ],
        resources: {
          cpu: { usage: 78, cores: 16, frequency: 2800 },
          memory: { used: 18.2, total: 64, unit: 'GB' },
          storage: { used: 4.8, available: 7.2, total: 12, unit: 'TB' },
          network: { bandwidth: 1000, latency: 25, uplink: 500, downlink: 500 }
        },
        metrics: {
          totalRequests: 2847,
          successfulRequests: 2789,
          failedRequests: 58,
          averageResponseTime: 67,
          dataTransferred: 8.9,
          revenue: 89.3,
          activeConnections: 12,
          queuedRequests: 5
        },
        compliance: {
          gdpr: 'compliant',
          hipaa: 'non-compliant',
          ccpa: 'partial',
          lastAudit: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          certifications: ['ISO 27001'],
          issues: [
            {
              id: 'issue_001',
              type: 'privacy',
              severity: 'medium',
              description: 'Customer consent verification needs updating',
              detected: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              resolved: false
            }
          ]
        },
        location: {
          country: 'United States',
          region: 'New York',
          city: 'New York',
          datacenter: 'Google Cloud US-East1',
          coordinates: { lat: 40.7128, lng: -74.0060 }
        },
        version: '2.0.8',
        features: ['MKFHE', 'Secure Aggregation', 'Anonymization']
      },
      {
        id: 'provider_003',
        address: '0x987654321B1cE45dF0f2e35C5ccA742d35Cc6C4',
        name: 'CryptoInsights',
        description: 'Cryptocurrency and DeFi market data provider',
        status: 'degraded',
        lastSeen: new Date(Date.now() - 5 * 60 * 1000),
        uptime: 94.1,
        reputation: 76.8,
        datasets: [
          {
            id: 'ds_004',
            title: 'Crypto Trading Patterns',
            category: 'Financial',
            size: 31457280,
            priceETH: 1.2,
            status: 'processing',
            accessCount: 87,
            lastAccessed: new Date(Date.now() - 4 * 60 * 60 * 1000),
            quality: { completeness: 89, accuracy: 93, freshness: 96 }
          }
        ],
        resources: {
          cpu: { usage: 95, cores: 8, frequency: 3600 },
          memory: { used: 28.4, total: 32, unit: 'GB' },
          storage: { used: 6.2, available: 1.8, total: 8, unit: 'TB' },
          network: { bandwidth: 500, latency: 78, uplink: 250, downlink: 250 }
        },
        metrics: {
          totalRequests: 956,
          successfulRequests: 847,
          failedRequests: 109,
          averageResponseTime: 156,
          dataTransferred: 3.4,
          revenue: 34.7,
          activeConnections: 3,
          queuedRequests: 8
        },
        compliance: {
          gdpr: 'partial',
          hipaa: 'non-compliant',
          ccpa: 'non-compliant',
          lastAudit: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          certifications: [],
          issues: [
            {
              id: 'issue_002',
              type: 'security',
              severity: 'high',
              description: 'SSL certificate expiring soon',
              detected: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              resolved: false
            }
          ]
        },
        location: {
          country: 'Singapore',
          region: 'Singapore',
          city: 'Singapore',
          datacenter: 'DigitalOcean SGP1',
          coordinates: { lat: 1.3521, lng: 103.8198 }
        },
        version: '1.9.2',
        features: ['MKFHE', 'Real-time Streaming']
      }
    ]

    const providerMap = new Map()
    mockProviders.forEach(provider => providerMap.set(provider.id, provider))
    setProviders(providerMap)

    if (!selectedProvider && mockProviders.length > 0) {
      setSelectedProvider(mockProviders[0].id)
    }

    // Mock alerts
    setAlerts([
      {
        id: 'alert_001',
        providerId: 'provider_003',
        type: 'performance',
        severity: 'warning',
        title: 'High Resource Usage',
        message: 'CryptoInsights is experiencing high CPU usage (95%)',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        acknowledged: false,
        resolved: false
      },
      {
        id: 'alert_002',
        providerId: 'provider_002',
        type: 'compliance',
        severity: 'error',
        title: 'Compliance Issue',
        message: 'DataMart Analytics has unresolved privacy compliance issues',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        acknowledged: true,
        resolved: false
      }
    ])
  }, [selectedProvider])

  // Subscribe to provider updates
  useEffect(() => {
    const unsubscribe = subscribe('provider_status', (message) => {
      const update = message.payload as Partial<DataProvider> & { id: string }
      
      setProviders(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(update.id)
        
        if (existing) {
          newMap.set(update.id, { ...existing, ...update, lastSeen: new Date() })
        }
        
        return newMap
      })
    })

    return unsubscribe
  }, [subscribe])

  // Subscribe to provider alerts
  useEffect(() => {
    const unsubscribe = subscribe('provider_alert', (message) => {
      const alert = message.payload as ProviderAlert
      
      setAlerts(prev => [alert, ...prev.slice(0, 99)]) // Keep last 100 alerts
      onAlertTriggered?.(alert)
    })

    return unsubscribe
  }, [subscribe, onAlertTriggered])

  // Auto-refresh provider status
  useEffect(() => {
    if (!connectionStatus.connected) return

    const interval = setInterval(() => {
      sendMessage('get_provider_status', {
        providerIds: Array.from(providers.keys())
      })
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [connectionStatus.connected, providers, refreshInterval, sendMessage])

  // Filter and sort providers
  const filteredProviders = useMemo(() => {
    let filtered = Array.from(providers.values())

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(provider =>
        provider.name.toLowerCase().includes(query) ||
        provider.description.toLowerCase().includes(query) ||
        provider.datasets.some(ds => ds.title.toLowerCase().includes(query))
      )
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(provider => provider.status === filterStatus)
    }

    // Compliance filter
    if (filterCompliance !== 'all') {
      filtered = filtered.filter(provider => {
        const { compliance } = provider
        switch (filterCompliance) {
          case 'compliant':
            return compliance.gdpr === 'compliant' && compliance.hipaa === 'compliant' && compliance.ccpa === 'compliant'
          case 'partial':
            return compliance.gdpr === 'partial' || compliance.hipaa === 'partial' || compliance.ccpa === 'partial'
          case 'non-compliant':
            return compliance.gdpr === 'non-compliant' || compliance.hipaa === 'non-compliant' || compliance.ccpa === 'non-compliant'
          default:
            return true
        }
      })
    }

    // Sort providers
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'status':
          return a.status.localeCompare(b.status)
        case 'reputation':
          return b.reputation - a.reputation
        case 'uptime':
          return b.uptime - a.uptime
        default:
          return 0
      }
    })

    return filtered
  }, [providers, searchQuery, filterStatus, filterCompliance, sortBy])

  const getStatusColor = (status: DataProvider['status']) => {
    switch (status) {
      case 'online': return 'text-green-500 bg-green-100 dark:bg-green-900/50'
      case 'offline': return 'text-gray-500 bg-gray-100 dark:bg-gray-700'
      case 'maintenance': return 'text-blue-500 bg-blue-100 dark:bg-blue-900/50'
      case 'degraded': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/50'
      case 'error': return 'text-red-500 bg-red-100 dark:bg-red-900/50'
    }
  }

  const getComplianceColor = (status: 'compliant' | 'partial' | 'non-compliant') => {
    switch (status) {
      case 'compliant': return 'text-green-600'
      case 'partial': return 'text-yellow-600'
      case 'non-compliant': return 'text-red-600'
    }
  }

  const formatBytes = (bytes: number, unit: 'MB' | 'GB' | 'TB' = 'GB') => {
    const multiplier = unit === 'MB' ? 1 : unit === 'GB' ? 1024 : 1024 * 1024
    return `${(bytes / multiplier).toFixed(1)} ${unit}`
  }

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(1)}%`
  }

  const getAlertColor = (severity: ProviderAlert['severity']) => {
    switch (severity) {
      case 'info': return 'text-blue-500 bg-blue-100 dark:bg-blue-900/50'
      case 'warning': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/50'
      case 'error': return 'text-red-500 bg-red-100 dark:bg-red-900/50'
      case 'critical': return 'text-red-600 bg-red-200 dark:bg-red-900/70'
    }
  }

  const selectedProv = selectedProvider ? providers.get(selectedProvider) : null
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged && !a.resolved)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data Provider Monitor</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time monitoring of data providers • {filteredProviders.length} active
            {unacknowledgedAlerts.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 text-xs font-medium rounded-full">
                {unacknowledgedAlerts.length} alerts
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search providers..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="maintenance">Maintenance</option>
            <option value="degraded">Degraded</option>
            <option value="error">Error</option>
          </select>

          <select
            value={filterCompliance}
            onChange={(e) => setFilterCompliance(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Compliance</option>
            <option value="compliant">Fully Compliant</option>
            <option value="partial">Partially Compliant</option>
            <option value="non-compliant">Non-Compliant</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="reputation">Reputation</option>
            <option value="name">Name</option>
            <option value="status">Status</option>
            <option value="uptime">Uptime</option>
          </select>

          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Showing {filteredProviders.length} providers</span>
          </div>
        </div>
      </div>

      {/* Provider Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}>
        {filteredProviders.map(provider => (
          <div
            key={provider.id}
            className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 cursor-pointer ${
              selectedProvider === provider.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => {
              setSelectedProvider(provider.id)
              onProviderSelect?.(provider)
            }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                    {provider.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {provider.description}
                  </p>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(provider.status)}`}>
                    {provider.status}
                  </span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {provider.reputation.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">reputation</div>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Uptime:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {formatUptime(provider.uptime)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Datasets:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {provider.datasets.length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Revenue:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {provider.metrics.revenue.toFixed(1)} ETH
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Requests:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {provider.metrics.totalRequests}
                  </span>
                </div>
              </div>

              {/* Resource Usage */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">CPU Usage</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {provider.resources.cpu.usage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      provider.resources.cpu.usage > 80 ? 'bg-red-500' :
                      provider.resources.cpu.usage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${provider.resources.cpu.usage}%` }}
                  />
                </div>
              </div>

              {/* Compliance Status */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Compliance:</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs ${getComplianceColor(provider.compliance.gdpr)}`}>
                    GDPR
                  </span>
                  <span className={`text-xs ${getComplianceColor(provider.compliance.hipaa)}`}>
                    HIPAA
                  </span>
                  <span className={`text-xs ${getComplianceColor(provider.compliance.ccpa)}`}>
                    CCPA
                  </span>
                </div>
              </div>

              {/* Alerts */}
              {alerts.filter(a => a.providerId === provider.id && !a.resolved).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm text-yellow-600 dark:text-yellow-400">
                      {alerts.filter(a => a.providerId === provider.id && !a.resolved).length} active alerts
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Provider Detail Modal */}
      {selectedProv && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedProv.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedProv.description}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProvider(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Status & Metrics */}
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Status & Performance</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedProv.status)}`}>
                          {selectedProv.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Uptime:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatUptime(selectedProv.uptime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Reputation:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedProv.reputation.toFixed(1)}/100
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Response Time:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedProv.metrics.averageResponseTime}ms
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Resources</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">CPU</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {selectedProv.resources.cpu.usage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${selectedProv.resources.cpu.usage}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Memory</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatBytes(selectedProv.resources.memory.used, selectedProv.resources.memory.unit)} / 
                            {formatBytes(selectedProv.resources.memory.total, selectedProv.resources.memory.unit)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${(selectedProv.resources.memory.used / selectedProv.resources.memory.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Column - Datasets */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Datasets ({selectedProv.datasets.length})
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedProv.datasets.map(dataset => (
                      <div key={dataset.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded">
                        <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                          {dataset.title}
                        </h5>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <div>Size: {formatBytes(dataset.size / 1024 / 1024)}</div>
                          <div>Price: {dataset.priceETH} ETH</div>
                          <div>Access: {dataset.accessCount}x</div>
                          <div>Quality: {dataset.quality.accuracy}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column - Compliance & Alerts */}
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Compliance</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">GDPR:</span>
                        <span className={`text-sm font-medium ${getComplianceColor(selectedProv.compliance.gdpr)}`}>
                          {selectedProv.compliance.gdpr}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">HIPAA:</span>
                        <span className={`text-sm font-medium ${getComplianceColor(selectedProv.compliance.hipaa)}`}>
                          {selectedProv.compliance.hipaa}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">CCPA:</span>
                        <span className={`text-sm font-medium ${getComplianceColor(selectedProv.compliance.ccpa)}`}>
                          {selectedProv.compliance.ccpa}
                        </span>
                      </div>
                    </div>
                    
                    {selectedProv.compliance.certifications.length > 0 && (
                      <div className="mt-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Certifications:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedProv.compliance.certifications.map(cert => (
                            <span key={cert} className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 text-xs rounded">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Alerts */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Active Alerts ({alerts.filter(a => a.providerId === selectedProv.id && !a.resolved).length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {alerts
                        .filter(alert => alert.providerId === selectedProv.id && !alert.resolved)
                        .map(alert => (
                          <div key={alert.id} className={`p-3 rounded-lg ${getAlertColor(alert.severity)}`}>
                            <div className="flex items-start justify-between mb-1">
                              <h5 className="font-medium text-sm">{alert.title}</h5>
                              <span className="text-xs">
                                {alert.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-xs opacity-90">{alert.message}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}