import { ComputationRequest, ComputationResult } from './algorithm-executor'
import { SMPCProcessor } from '@/lib/mkfhe/smpc-processor'

export interface ComputationNode {
  id: string
  type: 'third_party' | 'zk' | 'fhe'
  status: 'online' | 'offline' | 'busy'
  capacity: number
  currentLoad: number
  capabilities: string[]
  lastHeartbeat: number
  location: string
  trustScore: number
}

export interface RoutingDecision {
  selectedNode: ComputationNode
  routingReason: string
  estimatedTime: number
  estimatedCost: number
  fallbackNodes: ComputationNode[]
}

export interface LoadBalancingStrategy {
  type: 'round_robin' | 'least_loaded' | 'best_performance' | 'geographic'
  parameters?: Record<string, any>
}

class ComputationRouter {
  private nodes: Map<string, ComputationNode>
  private loadBalancingStrategy: LoadBalancingStrategy
  private routingHistory: Map<string, RoutingDecision>

  constructor() {
    this.nodes = new Map()
    this.loadBalancingStrategy = { type: 'least_loaded' }
    this.routingHistory = new Map()
    this.initializeDefaultNodes()
  }

  private initializeDefaultNodes(): void {
    // Initialize default computation nodes for demo
    const defaultNodes: ComputationNode[] = [
      {
        id: 'third_party_node_1',
        type: 'third_party',
        status: 'online',
        capacity: 100,
        currentLoad: 25,
        capabilities: ['javascript', 'python', 'statistical_analysis'],
        lastHeartbeat: Date.now(),
        location: 'us-east-1',
        trustScore: 95
      },
      {
        id: 'third_party_node_2',
        type: 'third_party',
        status: 'online',
        capacity: 80,
        currentLoad: 10,
        capabilities: ['javascript', 'machine_learning', 'data_processing'],
        lastHeartbeat: Date.now(),
        location: 'eu-west-1',
        trustScore: 90
      },
      {
        id: 'zk_node_1',
        type: 'zk',
        status: 'online',
        capacity: 50,
        currentLoad: 15,
        capabilities: ['arithmetic_circuits', 'proof_generation', 'snark'],
        lastHeartbeat: Date.now(),
        location: 'us-west-2',
        trustScore: 98
      },
      {
        id: 'fhe_node_1',
        type: 'fhe',
        status: 'online',
        capacity: 30,
        currentLoad: 5,
        capabilities: ['homomorphic_encryption', 'mkfhe', 'sealed'],
        lastHeartbeat: Date.now(),
        location: 'us-east-1',
        trustScore: 92
      }
    ]

    defaultNodes.forEach(node => {
      this.nodes.set(node.id, node)
    })
  }

  async routeComputation(request: ComputationRequest): Promise<RoutingDecision> {
    // Filter nodes by computation type
    const compatibleNodes = Array.from(this.nodes.values())
      .filter(node => node.type === request.computationType)
      .filter(node => node.status === 'online')
      .filter(node => node.currentLoad < node.capacity * 0.9) // Not overloaded

    if (compatibleNodes.length === 0) {
      throw new Error(`No available nodes for computation type: ${request.computationType}`)
    }

    // Apply load balancing strategy
    const selectedNode = this.selectOptimalNode(compatibleNodes, request)
    
    // Calculate estimated time and cost
    const estimatedTime = this.estimateExecutionTime(selectedNode, request)
    const estimatedCost = this.estimateCost(selectedNode, request)

    // Prepare fallback nodes
    const fallbackNodes = compatibleNodes
      .filter(node => node.id !== selectedNode.id)
      .sort((a, b) => this.calculateNodeScore(b, request) - this.calculateNodeScore(a, request))
      .slice(0, 2)

    const decision: RoutingDecision = {
      selectedNode,
      routingReason: this.generateRoutingReason(selectedNode, request),
      estimatedTime,
      estimatedCost,
      fallbackNodes
    }

    // Store routing decision
    this.routingHistory.set(request.id, decision)

    // Update node load
    this.updateNodeLoad(selectedNode.id, request)

    return decision
  }

  private selectOptimalNode(
    nodes: ComputationNode[],
    request: ComputationRequest
  ): ComputationNode {
    switch (this.loadBalancingStrategy.type) {
      case 'round_robin':
        return this.selectRoundRobin(nodes)
      
      case 'least_loaded':
        return this.selectLeastLoaded(nodes)
      
      case 'best_performance':
        return this.selectBestPerformance(nodes, request)
      
      case 'geographic':
        return this.selectGeographic(nodes, request)
      
      default:
        return this.selectLeastLoaded(nodes)
    }
  }

  private selectRoundRobin(nodes: ComputationNode[]): ComputationNode {
    // Simple round-robin selection
    const sortedNodes = nodes.sort((a, b) => a.id.localeCompare(b.id))
    const index = Date.now() % sortedNodes.length
    return sortedNodes[index]
  }

  private selectLeastLoaded(nodes: ComputationNode[]): ComputationNode {
    return nodes.reduce((leastLoaded, current) => {
      const currentLoadPercent = current.currentLoad / current.capacity
      const leastLoadedPercent = leastLoaded.currentLoad / leastLoaded.capacity
      return currentLoadPercent < leastLoadedPercent ? current : leastLoaded
    })
  }

  private selectBestPerformance(
    nodes: ComputationNode[],
    request: ComputationRequest
  ): ComputationNode {
    return nodes.reduce((best, current) => {
      const currentScore = this.calculateNodeScore(current, request)
      const bestScore = this.calculateNodeScore(best, request)
      return currentScore > bestScore ? current : best
    })
  }

  private selectGeographic(
    nodes: ComputationNode[],
    request: ComputationRequest
  ): ComputationNode {
    // Prefer nodes in same region (simplified logic)
    const preferredRegion = this.getUserRegion(request.requesterAddress)
    const sameRegionNodes = nodes.filter(node => 
      node.location.startsWith(preferredRegion.split('-')[0])
    )
    
    if (sameRegionNodes.length > 0) {
      return this.selectLeastLoaded(sameRegionNodes)
    }
    
    return this.selectLeastLoaded(nodes)
  }

  private calculateNodeScore(node: ComputationNode, request: ComputationRequest): number {
    let score = 0
    
    // Trust score (0-40 points)
    score += (node.trustScore / 100) * 40
    
    // Load score (0-30 points) - lower load is better
    const loadPercent = node.currentLoad / node.capacity
    score += (1 - loadPercent) * 30
    
    // Capability match (0-20 points)
    const requiredCapabilities = this.getRequiredCapabilities(request)
    const matchedCapabilities = requiredCapabilities.filter(cap => 
      node.capabilities.includes(cap)
    ).length
    score += (matchedCapabilities / requiredCapabilities.length) * 20
    
    // Heartbeat freshness (0-10 points)
    const timeSinceHeartbeat = Date.now() - node.lastHeartbeat
    const heartbeatScore = Math.max(0, 10 - (timeSinceHeartbeat / 60000)) // Deduct points per minute
    score += heartbeatScore
    
    return score
  }

  private getRequiredCapabilities(request: ComputationRequest): string[] {
    switch (request.computationType) {
      case 'third_party':
        return ['javascript', 'statistical_analysis']
      case 'zk':
        return ['arithmetic_circuits', 'proof_generation']
      case 'fhe':
        return ['homomorphic_encryption', 'mkfhe']
      default:
        return []
    }
  }

  private getUserRegion(userAddress: string): string {
    // Simplified region detection based on user address
    // In practice, this would use geolocation or user preferences
    const hash = userAddress.slice(-2)
    const regionIndex = parseInt(hash, 16) % 3
    return ['us-east-1', 'eu-west-1', 'us-west-2'][regionIndex]
  }

  private estimateExecutionTime(node: ComputationNode, request: ComputationRequest): number {
    const baseTime = this.getBaseExecutionTime(request.computationType)
    const loadMultiplier = 1 + (node.currentLoad / node.capacity)
    const complexityMultiplier = this.getComplexityMultiplier(request)
    
    return Math.round(baseTime * loadMultiplier * complexityMultiplier)
  }

  private getBaseExecutionTime(computationType: string): number {
    switch (computationType) {
      case 'third_party': return 5000  // 5 seconds
      case 'zk': return 15000          // 15 seconds
      case 'fhe': return 30000         // 30 seconds
      default: return 10000
    }
  }

  private getComplexityMultiplier(request: ComputationRequest): number {
    // Estimate complexity based on input data size and parameters
    const inputDataCount = request.inputDataIds.length
    const hasParameters = request.parameters && Object.keys(request.parameters).length > 0
    
    let multiplier = 1
    multiplier += inputDataCount * 0.1    // 10% per input data source
    multiplier += hasParameters ? 0.2 : 0 // 20% if parameters are provided
    
    return Math.min(multiplier, 3) // Cap at 3x
  }

  private estimateCost(node: ComputationNode, request: ComputationRequest): number {
    const baseCost = this.getBaseCost(request.computationType)
    const complexityMultiplier = this.getComplexityMultiplier(request)
    const nodeMultiplier = this.getNodeCostMultiplier(node)
    
    return Math.round(baseCost * complexityMultiplier * nodeMultiplier * 100) / 100
  }

  private getBaseCost(computationType: string): number {
    switch (computationType) {
      case 'third_party': return 0.10  // $0.10
      case 'zk': return 0.50           // $0.50
      case 'fhe': return 1.00          // $1.00
      default: return 0.25
    }
  }

  private getNodeCostMultiplier(node: ComputationNode): number {
    // Higher trust score nodes can charge more
    const trustMultiplier = 0.5 + (node.trustScore / 100) * 0.5 // 0.5 to 1.0
    
    // Lower capacity nodes charge more
    const capacityMultiplier = node.capacity < 50 ? 1.2 : 1.0
    
    return trustMultiplier * capacityMultiplier
  }

  private generateRoutingReason(node: ComputationNode, request: ComputationRequest): string {
    const loadPercent = Math.round((node.currentLoad / node.capacity) * 100)
    return `Selected ${node.id} for ${request.computationType} computation. ` +
           `Node load: ${loadPercent}%, Trust score: ${node.trustScore}%, ` +
           `Location: ${node.location}`
  }

  private updateNodeLoad(nodeId: string, request: ComputationRequest): void {
    const node = this.nodes.get(nodeId)
    if (node) {
      // Estimate load increase based on computation type
      const loadIncrease = this.estimateLoadIncrease(request)
      node.currentLoad = Math.min(node.capacity, node.currentLoad + loadIncrease)
      this.nodes.set(nodeId, node)
    }
  }

  private estimateLoadIncrease(request: ComputationRequest): number {
    switch (request.computationType) {
      case 'third_party': return 5
      case 'zk': return 15
      case 'fhe': return 25
      default: return 10
    }
  }

  // Public methods for node management
  registerNode(node: ComputationNode): void {
    this.nodes.set(node.id, node)
    console.log(`Node ${node.id} registered successfully`)
  }

  updateNodeStatus(nodeId: string, status: ComputationNode['status']): void {
    const node = this.nodes.get(nodeId)
    if (node) {
      node.status = status
      node.lastHeartbeat = Date.now()
      this.nodes.set(nodeId, node)
    }
  }

  updateNodeLoad(nodeId: string, newLoad: number): void {
    const node = this.nodes.get(nodeId)
    if (node) {
      node.currentLoad = Math.max(0, Math.min(node.capacity, newLoad))
      node.lastHeartbeat = Date.now()
      this.nodes.set(nodeId, node)
    }
  }

  removeNode(nodeId: string): void {
    this.nodes.delete(nodeId)
    console.log(`Node ${nodeId} removed`)
  }

  getNodeStatus(): ComputationNode[] {
    return Array.from(this.nodes.values())
  }

  getActiveNodes(computationType?: string): ComputationNode[] {
    let nodes = Array.from(this.nodes.values())
      .filter(node => node.status === 'online')
    
    if (computationType) {
      nodes = nodes.filter(node => node.type === computationType)
    }
    
    return nodes
  }

  setLoadBalancingStrategy(strategy: LoadBalancingStrategy): void {
    this.loadBalancingStrategy = strategy
    console.log(`Load balancing strategy updated to: ${strategy.type}`)
  }

  getRoutingHistory(requestId?: string): RoutingDecision[] {
    if (requestId) {
      const decision = this.routingHistory.get(requestId)
      return decision ? [decision] : []
    }
    return Array.from(this.routingHistory.values())
  }

  // Performance monitoring
  getPerformanceMetrics(): any {
    const nodes = Array.from(this.nodes.values())
    
    return {
      totalNodes: nodes.length,
      onlineNodes: nodes.filter(n => n.status === 'online').length,
      offlineNodes: nodes.filter(n => n.status === 'offline').length,
      busyNodes: nodes.filter(n => n.status === 'busy').length,
      averageLoad: nodes.reduce((sum, n) => sum + (n.currentLoad / n.capacity), 0) / nodes.length,
      totalCapacity: nodes.reduce((sum, n) => sum + n.capacity, 0),
      totalCurrentLoad: nodes.reduce((sum, n) => sum + n.currentLoad, 0),
      byType: {
        third_party: nodes.filter(n => n.type === 'third_party').length,
        zk: nodes.filter(n => n.type === 'zk').length,
        fhe: nodes.filter(n => n.type === 'fhe').length
      },
      averageTrustScore: nodes.reduce((sum, n) => sum + n.trustScore, 0) / nodes.length
    }
  }

  // Health check for nodes
  performHealthCheck(): void {
    const now = Date.now()
    const staleThreshold = 5 * 60 * 1000 // 5 minutes
    
    for (const [nodeId, node] of this.nodes.entries()) {
      if (now - node.lastHeartbeat > staleThreshold) {
        console.warn(`Node ${nodeId} appears stale, marking as offline`)
        node.status = 'offline'
        this.nodes.set(nodeId, node)
      }
    }
  }
}

export const computationRouter = new ComputationRouter()
export default computationRouter