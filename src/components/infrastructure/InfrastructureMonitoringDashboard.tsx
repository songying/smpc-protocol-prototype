'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, CheckCircle, Clock, Server, Activity, Zap, Shield, MapPin, TrendingUp, AlertTriangle } from 'lucide-react'
import { useAccount } from 'wagmi'

interface ComputationNode {
  id: string
  type: 'third_party' | 'zk' | 'fhe'
  status: 'online' | 'offline' | 'busy'
  capacity: number
  currentLoad: number
  utilizationRate: number
  capabilities: string[]
  location: string
  trustScore: number
  lastHeartbeat: string
  uptime: string
  healthScore: number
}

interface InfrastructureOverview {
  timestamp: string
  infrastructure: {
    totalNodes: number
    onlineNodes: number
    computationTypes: {
      third_party: number
      zk: number
      fhe: number
    }
  }
  computations: {
    active: number
    queued: number
    total: number
  }
  performance: {
    averageLoad: number
    totalCapacity: number
    utilizationRate: number
  }
  health: {
    status: 'healthy' | 'degraded' | 'critical'
    issues: string[]
  }
}

interface NodeDetails {
  nodes: ComputationNode[]
  summary: {
    byType: Record<string, number>
    byStatus: Record<string, number>
    byLocation: Record<string, number>
  }
}

interface PerformanceMetrics {
  infrastructure: any
  execution: {
    averageExecutionTime: number
    completionRate: number
    throughput: number
    errorRate: number
  }
  resources: {
    cpuUtilization: number
    memoryUtilization: number
    networkUtilization: number
  }
  trends: {
    executionTime: {
      trend: string
      change: string
      data: number[]
    }
    throughput: {
      trend: string
      change: string
      data: number[]
    }
    errorRate: {
      trend: string
      change: string
      data: number[]
    }
  }
}

interface RoutingAnalytics {
  routingDecisions: any[]
  analytics: {
    totalRoutingDecisions: number
    routingByType: Record<string, number>
    averageEstimatedTime: number
    averageEstimatedCost: number
    nodeUtilization: Record<string, number>
  }
  optimization: {
    suggestedImprovements: string[]
    loadBalancingEfficiency: number
  }
}

interface HealthStatus {
  overallStatus: 'healthy' | 'degraded' | 'critical'
  lastChecked: string
  components: Array<{
    component: string
    status: 'healthy' | 'degraded' | 'critical'
    details: string
  }>
  recommendations: string[]
  alerts: Array<{
    severity: 'critical' | 'warning' | 'info'
    component: string
    message: string
    timestamp: string
  }>
}

export default function InfrastructureMonitoringDashboard() {
  const { address, isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState('overview')
  const [overview, setOverview] = useState<InfrastructureOverview | null>(null)
  const [nodeDetails, setNodeDetails] = useState<NodeDetails | null>(null)
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null)
  const [routing, setRouting] = useState<RoutingAnalytics | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = async (view: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/infrastructure?view=${view}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${address}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch infrastructure data')
      }
      
      const data = await response.json()
      
      switch (view) {
        case 'overview':
          setOverview(data)
          break
        case 'nodes':
          setNodeDetails(data)
          break
        case 'performance':
          setPerformance(data)
          break
        case 'routing':
          setRouting(data)
          break
        case 'health':
          setHealth(data)
          break
      }
    } catch (error) {
      console.error(`Error fetching ${view} data:`, error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected) {
      fetchData(activeTab)
    }
  }, [activeTab, isConnected])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (autoRefresh && isConnected) {
      interval = setInterval(() => {
        fetchData(activeTab)
      }, 30000) // Refresh every 30 seconds
    }
    return () => clearInterval(interval)
  }, [activeTab, autoRefresh, isConnected])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'bg-green-500'
      case 'degraded':
      case 'busy':
        return 'bg-yellow-500'
      case 'critical':
      case 'offline':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircle className="h-4 w-4" />
      case 'degraded':
      case 'busy':
        return <Clock className="h-4 w-4" />
      case 'critical':
      case 'offline':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Server className="h-4 w-4" />
    }
  }

  const getComputationTypeIcon = (type: string) => {
    switch (type) {
      case 'third_party':
        return <Server className="h-4 w-4" />
      case 'zk':
        return <Shield className="h-4 w-4" />
      case 'fhe':
        return <Zap className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'decreasing':
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
      default:
        return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  if (!isConnected) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
              <p className="text-muted-foreground">
                Please connect your wallet to access the infrastructure monitoring dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Infrastructure Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of SMPC computation infrastructure
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(activeTab)}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="nodes">Nodes</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="routing">Routing</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {overview && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
                    <Server className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overview.infrastructure.totalNodes}</div>
                    <p className="text-xs text-muted-foreground">
                      {overview.infrastructure.onlineNodes} online
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Computations</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overview.computations.active}</div>
                    <p className="text-xs text-muted-foreground">
                      {overview.computations.queued} queued
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">System Load</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overview.performance.utilizationRate}%</div>
                    <Progress value={overview.performance.utilizationRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">System Health</CardTitle>
                    {getStatusIcon(overview.health.status)}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold capitalize">{overview.health.status}</div>
                    <Badge variant={overview.health.status === 'healthy' ? 'default' : 'destructive'} className="mt-2">
                      {overview.health.issues.length} issues
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Computation Types Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(overview.infrastructure.computationTypes).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getComputationTypeIcon(type)}
                          <span className="capitalize">{type.replace('_', ' ')}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{count}</div>
                          <div className="text-xs text-muted-foreground">nodes</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>System Health Issues</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {overview.health.issues.length === 0 ? (
                      <div className="text-center py-4">
                        <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                        <p className="text-sm text-muted-foreground">No issues detected</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {overview.health.issues.map((issue, index) => (
                          <div key={index} className="flex items-center space-x-2 p-2 bg-destructive/10 rounded">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <span className="text-sm">{issue}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="nodes" className="space-y-4">
          {nodeDetails && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>By Type</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(nodeDetails.summary.byType).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>By Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(nodeDetails.summary.byStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between">
                        <span className="capitalize">{status}</span>
                        <Badge variant={status === 'online' ? 'default' : 'destructive'}>{count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>By Location</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(nodeDetails.summary.byLocation).map(([location, count]) => (
                      <div key={location} className="flex justify-between">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{location}</span>
                        </div>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Node Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {nodeDetails.nodes.map((node) => (
                      <div key={node.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(node.status)}`}></div>
                            <h3 className="font-medium">{node.id}</h3>
                            <Badge variant="outline" className="capitalize">
                              {node.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={node.status === 'online' ? 'default' : 'destructive'}>
                              {node.status}
                            </Badge>
                            <Badge variant="outline">Trust: {node.trustScore}%</Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Utilization</div>
                            <div className="font-medium">{node.utilizationRate}%</div>
                            <Progress value={node.utilizationRate} className="mt-1" />
                          </div>
                          <div>
                            <div className="text-muted-foreground">Load</div>
                            <div className="font-medium">{node.currentLoad}/{node.capacity}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Location</div>
                            <div className="font-medium">{node.location}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Uptime</div>
                            <div className="font-medium">{node.uptime}</div>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <div className="text-muted-foreground text-xs mb-1">Capabilities</div>
                          <div className="flex flex-wrap gap-1">
                            {node.capabilities.map((capability) => (
                              <Badge key={capability} variant="secondary" className="text-xs">
                                {capability.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {performance && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Execution Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performance.execution.averageExecutionTime}ms</div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      {getTrendIcon(performance.trends.executionTime.trend)}
                      <span>{performance.trends.executionTime.change}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performance.execution.completionRate}%</div>
                    <Progress value={performance.execution.completionRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Throughput</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performance.execution.throughput}</div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      {getTrendIcon(performance.trends.throughput.trend)}
                      <span>{performance.trends.throughput.change}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performance.execution.errorRate}%</div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      {getTrendIcon(performance.trends.errorRate.trend)}
                      <span>{performance.trends.errorRate.change}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Resource Utilization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>CPU Utilization</span>
                        <span>{Math.round(performance.resources.cpuUtilization)}%</span>
                      </div>
                      <Progress value={performance.resources.cpuUtilization} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Memory Utilization</span>
                        <span>{Math.round(performance.resources.memoryUtilization)}%</span>
                      </div>
                      <Progress value={performance.resources.memoryUtilization} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Network Utilization</span>
                        <span>{Math.round(performance.resources.networkUtilization)}%</span>
                      </div>
                      <Progress value={performance.resources.networkUtilization} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="routing" className="space-y-4">
          {routing && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Decisions</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{routing.analytics.totalRoutingDecisions}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{routing.analytics.averageEstimatedTime}ms</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Cost</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${routing.analytics.averageEstimatedCost}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">LB Efficiency</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{routing.optimization.loadBalancingEfficiency}%</div>
                    <Progress value={routing.optimization.loadBalancingEfficiency} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Routing by Type</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(routing.analytics.routingByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getComputationTypeIcon(type)}
                          <span className="capitalize">{type.replace('_', ' ')}</span>
                        </div>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Optimization Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {routing.optimization.suggestedImprovements.map((suggestion, index) => (
                        <div key={index} className="flex items-start space-x-2 p-2 bg-blue-50 rounded">
                          <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
                          <span className="text-sm">{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          {health && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {getStatusIcon(health.overallStatus)}
                    <span>System Health Status</span>
                    <Badge variant={health.overallStatus === 'healthy' ? 'default' : 'destructive'}>
                      {health.overallStatus}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Last checked: {new Date(health.lastChecked).toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Component Health</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {health.components.map((component, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(component.status)}
                          <div>
                            <div className="font-medium">{component.component}</div>
                            <div className="text-sm text-muted-foreground">{component.details}</div>
                          </div>
                        </div>
                        <Badge variant={component.status === 'healthy' ? 'default' : 'destructive'}>
                          {component.status}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {health.recommendations.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No recommendations at this time.</p>
                      ) : (
                        <div className="space-y-2">
                          {health.recommendations.map((rec, index) => (
                            <div key={index} className="flex items-start space-x-2 p-2 bg-blue-50 rounded">
                              <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                              <span className="text-sm">{rec}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {health.alerts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No recent alerts.</p>
                      ) : (
                        <div className="space-y-2">
                          {health.alerts.map((alert, index) => (
                            <div key={index} className={`p-3 rounded border-l-4 ${
                              alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                              alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                              'border-blue-500 bg-blue-50'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-sm">{alert.component}</div>
                                <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                                  {alert.severity}
                                </Badge>
                              </div>
                              <div className="text-sm mt-1">{alert.message}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(alert.timestamp).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}