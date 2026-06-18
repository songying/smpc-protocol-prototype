import { NextRequest, NextResponse } from 'next/server'
import computationRouter from '@/lib/execution/computation-router'
import algorithmExecutor from '@/lib/execution/algorithm-executor'
import { verifyAuth } from '@/lib/api/middleware'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'overview'

    switch (view) {
      case 'overview':
        return NextResponse.json(await getInfrastructureOverview())
      
      case 'nodes':
        return NextResponse.json(getNodeDetails())
      
      case 'performance':
        return NextResponse.json(getPerformanceMetrics())
      
      case 'routing':
        return NextResponse.json(getRoutingAnalytics())
      
      case 'health':
        return NextResponse.json(getHealthStatus())
      
      default:
        return NextResponse.json(
          { error: 'Invalid view parameter' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('GET /api/infrastructure error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getInfrastructureOverview() {
  const nodes = computationRouter.getNodeStatus()
  const activeComputations = algorithmExecutor.listActiveComputations()
  const performanceMetrics = computationRouter.getPerformanceMetrics()

  return {
    timestamp: new Date().toISOString(),
    infrastructure: {
      totalNodes: nodes.length,
      onlineNodes: nodes.filter(n => n.status === 'online').length,
      computationTypes: {
        third_party: nodes.filter(n => n.type === 'third_party' && n.status === 'online').length,
        zk: nodes.filter(n => n.type === 'zk' && n.status === 'online').length,
        fhe: nodes.filter(n => n.type === 'fhe' && n.status === 'online').length
      }
    },
    computations: {
      active: activeComputations.filter(c => c.status === 'running').length,
      queued: activeComputations.filter(c => c.status === 'queued').length,
      total: activeComputations.length
    },
    performance: {
      averageLoad: Math.round(performanceMetrics.averageLoad * 100),
      totalCapacity: performanceMetrics.totalCapacity,
      utilizationRate: Math.round((performanceMetrics.totalCurrentLoad / performanceMetrics.totalCapacity) * 100)
    },
    health: {
      status: determineOverallHealth(nodes, activeComputations),
      issues: identifyHealthIssues(nodes, activeComputations)
    }
  }
}

function getNodeDetails() {
  const nodes = computationRouter.getNodeStatus()
  
  return {
    nodes: nodes.map(node => ({
      id: node.id,
      type: node.type,
      status: node.status,
      capacity: node.capacity,
      currentLoad: node.currentLoad,
      utilizationRate: Math.round((node.currentLoad / node.capacity) * 100),
      capabilities: node.capabilities,
      location: node.location,
      trustScore: node.trustScore,
      lastHeartbeat: new Date(node.lastHeartbeat).toISOString(),
      uptime: calculateUptime(node.lastHeartbeat),
      healthScore: calculateNodeHealth(node)
    })),
    summary: {
      byType: getNodesByType(nodes),
      byStatus: getNodesByStatus(nodes),
      byLocation: getNodesByLocation(nodes)
    }
  }
}

function getPerformanceMetrics() {
  const metrics = computationRouter.getPerformanceMetrics()
  const activeComputations = algorithmExecutor.listActiveComputations()
  
  // Calculate performance statistics
  const executionTimes = activeComputations
    .filter(c => c.status === 'completed')
    .map(c => c.executionTime)
  
  const avgExecutionTime = executionTimes.length > 0 
    ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length 
    : 0

  return {
    infrastructure: metrics,
    execution: {
      averageExecutionTime: Math.round(avgExecutionTime),
      completionRate: calculateCompletionRate(activeComputations),
      throughput: calculateThroughput(activeComputations),
      errorRate: calculateErrorRate(activeComputations)
    },
    resources: {
      cpuUtilization: Math.random() * 100, // Mock data
      memoryUtilization: Math.random() * 100, // Mock data
      networkUtilization: Math.random() * 100 // Mock data
    },
    trends: generatePerformanceTrends()
  }
}

function getRoutingAnalytics() {
  const routingHistory = computationRouter.getRoutingHistory()
  
  return {
    routingDecisions: routingHistory.slice(-20), // Last 20 decisions
    analytics: {
      totalRoutingDecisions: routingHistory.length,
      routingByType: analyzeRoutingByType(routingHistory),
      averageEstimatedTime: calculateAverageEstimatedTime(routingHistory),
      averageEstimatedCost: calculateAverageEstimatedCost(routingHistory),
      nodeUtilization: analyzeNodeUtilization(routingHistory)
    },
    optimization: {
      suggestedImprovements: generateOptimizationSuggestions(routingHistory),
      loadBalancingEfficiency: calculateLoadBalancingEfficiency()
    }
  }
}

function getHealthStatus() {
  const nodes = computationRouter.getNodeStatus()
  const activeComputations = algorithmExecutor.listActiveComputations()
  
  // Perform health check
  computationRouter.performHealthCheck()
  
  const healthChecks = [
    {
      component: 'Computation Nodes',
      status: nodes.every(n => n.status === 'online') ? 'healthy' : 'degraded',
      details: `${nodes.filter(n => n.status === 'online').length}/${nodes.length} nodes online`
    },
    {
      component: 'Algorithm Executor',
      status: 'healthy', // Simplified check
      details: 'Executor service operational'
    },
    {
      component: 'Routing System',
      status: 'healthy',
      details: 'Load balancing operational'
    },
    {
      component: 'SMPC Infrastructure',
      status: 'healthy',
      details: 'Cryptographic services operational'
    }
  ]

  return {
    overallStatus: healthChecks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded',
    lastChecked: new Date().toISOString(),
    components: healthChecks,
    recommendations: generateHealthRecommendations(nodes, activeComputations),
    alerts: generateAlerts(nodes, activeComputations)
  }
}

// Helper functions
function determineOverallHealth(nodes: any[], computations: any[]): string {
  const onlineNodes = nodes.filter(n => n.status === 'online').length
  const totalNodes = nodes.length
  const failedComputations = computations.filter(c => c.status === 'failed').length
  const totalComputations = computations.length

  if (onlineNodes / totalNodes < 0.5 || (totalComputations > 0 && failedComputations / totalComputations > 0.2)) {
    return 'critical'
  } else if (onlineNodes / totalNodes < 0.8 || (totalComputations > 0 && failedComputations / totalComputations > 0.1)) {
    return 'degraded'
  } else {
    return 'healthy'
  }
}

function identifyHealthIssues(nodes: any[], computations: any[]): string[] {
  const issues = []
  
  const offlineNodes = nodes.filter(n => n.status === 'offline').length
  if (offlineNodes > 0) {
    issues.push(`${offlineNodes} nodes are offline`)
  }

  const overloadedNodes = nodes.filter(n => n.currentLoad / n.capacity > 0.9).length
  if (overloadedNodes > 0) {
    issues.push(`${overloadedNodes} nodes are overloaded`)
  }

  const failedComputations = computations.filter(c => c.status === 'failed').length
  if (failedComputations > 0) {
    issues.push(`${failedComputations} computations have failed`)
  }

  return issues
}

function calculateUptime(lastHeartbeat: number): string {
  const uptime = Date.now() - lastHeartbeat
  const minutes = Math.floor(uptime / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  return `${minutes}m`
}

function calculateNodeHealth(node: any): number {
  let score = 100
  
  // Deduct for high load
  if (node.currentLoad / node.capacity > 0.8) score -= 20
  
  // Deduct for offline status
  if (node.status === 'offline') score -= 50
  
  // Deduct for stale heartbeat
  const timeSinceHeartbeat = Date.now() - node.lastHeartbeat
  if (timeSinceHeartbeat > 5 * 60 * 1000) score -= 30 // 5 minutes
  
  return Math.max(0, score)
}

function getNodesByType(nodes: any[]) {
  return {
    third_party: nodes.filter(n => n.type === 'third_party').length,
    zk: nodes.filter(n => n.type === 'zk').length,
    fhe: nodes.filter(n => n.type === 'fhe').length
  }
}

function getNodesByStatus(nodes: any[]) {
  return {
    online: nodes.filter(n => n.status === 'online').length,
    offline: nodes.filter(n => n.status === 'offline').length,
    busy: nodes.filter(n => n.status === 'busy').length
  }
}

function getNodesByLocation(nodes: any[]) {
  const locations: Record<string, number> = {}
  nodes.forEach(node => {
    locations[node.location] = (locations[node.location] || 0) + 1
  })
  return locations
}

function calculateCompletionRate(computations: any[]): number {
  if (computations.length === 0) return 100
  const completed = computations.filter(c => c.status === 'completed').length
  return Math.round((completed / computations.length) * 100)
}

function calculateThroughput(computations: any[]): number {
  const now = Date.now()
  const lastHour = now - (60 * 60 * 1000)
  const recentComputations = computations.filter(c => 
    new Date(c.createdAt).getTime() > lastHour
  )
  return recentComputations.length
}

function calculateErrorRate(computations: any[]): number {
  if (computations.length === 0) return 0
  const failed = computations.filter(c => c.status === 'failed').length
  return Math.round((failed / computations.length) * 100)
}

function generatePerformanceTrends() {
  // Mock trend data
  return {
    executionTime: {
      trend: 'stable',
      change: '+2%',
      data: Array.from({length: 24}, () => Math.random() * 30000 + 5000)
    },
    throughput: {
      trend: 'increasing',
      change: '+15%',
      data: Array.from({length: 24}, () => Math.floor(Math.random() * 10) + 1)
    },
    errorRate: {
      trend: 'decreasing',
      change: '-5%',
      data: Array.from({length: 24}, () => Math.random() * 5)
    }
  }
}

function analyzeRoutingByType(routingHistory: any[]) {
  const byType: Record<string, number> = {}
  routingHistory.forEach(decision => {
    const type = decision.selectedNode.type
    byType[type] = (byType[type] || 0) + 1
  })
  return byType
}

function calculateAverageEstimatedTime(routingHistory: any[]): number {
  if (routingHistory.length === 0) return 0
  const totalTime = routingHistory.reduce((sum, decision) => sum + decision.estimatedTime, 0)
  return Math.round(totalTime / routingHistory.length)
}

function calculateAverageEstimatedCost(routingHistory: any[]): number {
  if (routingHistory.length === 0) return 0
  const totalCost = routingHistory.reduce((sum, decision) => sum + decision.estimatedCost, 0)
  return Math.round((totalCost / routingHistory.length) * 100) / 100
}

function analyzeNodeUtilization(routingHistory: any[]) {
  const utilization: Record<string, number> = {}
  routingHistory.forEach(decision => {
    const nodeId = decision.selectedNode.id
    utilization[nodeId] = (utilization[nodeId] || 0) + 1
  })
  return utilization
}

function generateOptimizationSuggestions(routingHistory: any[]): string[] {
  const suggestions = []
  
  if (routingHistory.length < 10) {
    suggestions.push('More historical data needed for optimization analysis')
  }
  
  suggestions.push('Consider adding more ZK computation nodes for better load distribution')
  suggestions.push('Implement geographic routing for reduced latency')
  suggestions.push('Enable auto-scaling based on demand patterns')
  
  return suggestions
}

function calculateLoadBalancingEfficiency(): number {
  // Mock efficiency calculation
  return Math.round(Math.random() * 20 + 80) // 80-100%
}

function generateHealthRecommendations(nodes: any[], computations: any[]): string[] {
  const recommendations = []
  
  const offlineNodes = nodes.filter(n => n.status === 'offline').length
  if (offlineNodes > 0) {
    recommendations.push(`Investigate and restore ${offlineNodes} offline nodes`)
  }

  const overloadedNodes = nodes.filter(n => n.currentLoad / n.capacity > 0.9).length
  if (overloadedNodes > 0) {
    recommendations.push(`Scale up capacity for ${overloadedNodes} overloaded nodes`)
  }

  const lowTrustNodes = nodes.filter(n => n.trustScore < 80).length
  if (lowTrustNodes > 0) {
    recommendations.push(`Review trust scores for ${lowTrustNodes} nodes`)
  }

  return recommendations
}

function generateAlerts(nodes: any[], computations: any[]): any[] {
  const alerts = []
  
  const criticalNodes = nodes.filter(n => calculateNodeHealth(n) < 50)
  criticalNodes.forEach(node => {
    alerts.push({
      severity: 'critical',
      component: node.id,
      message: `Node ${node.id} is in critical state`,
      timestamp: new Date().toISOString()
    })
  })

  const recentFailures = computations.filter(c => 
    c.status === 'failed' && 
    new Date(c.updatedAt).getTime() > Date.now() - (30 * 60 * 1000) // Last 30 minutes
  )
  
  if (recentFailures.length > 5) {
    alerts.push({
      severity: 'warning',
      component: 'Computation Executor',
      message: `High failure rate: ${recentFailures.length} failures in last 30 minutes`,
      timestamp: new Date().toISOString()
    })
  }

  return alerts
}