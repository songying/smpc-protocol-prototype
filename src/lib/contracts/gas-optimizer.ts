import { ethers } from 'ethers'
import { ContractClient } from './contract-client'

export interface GasOptimizationResult {
  originalEstimate: bigint
  optimizedEstimate: bigint
  savings: bigint
  savingsPercentage: number
  recommendations: string[]
}

export interface GasProfile {
  contractName: string
  methodName: string
  averageGas: bigint
  minGas: bigint
  maxGas: bigint
  callCount: number
  totalGasUsed: bigint
  lastUpdated: number
}

export interface BatchTransactionRequest {
  contractName: string
  methodName: string
  args: any[]
  value?: bigint
}

export class GasOptimizer {
  private contractClient: ContractClient
  private provider: ethers.Provider
  private gasProfiles: Map<string, GasProfile> = new Map()

  constructor(contractClient: ContractClient) {
    this.contractClient = contractClient
    this.provider = (contractClient as any).provider
  }

  // Optimize gas for a single transaction
  async optimizeTransaction(
    contractName: string,
    methodName: string,
    args: any[] = [],
    value?: bigint
  ): Promise<GasOptimizationResult> {
    try {
      // Get base gas estimate
      const originalEstimate = await this.contractClient.estimateGas(
        contractName,
        methodName,
        args
      )

      if (!originalEstimate) {
        throw new Error('Failed to get gas estimate')
      }

      const recommendations: string[] = []
      let optimizedEstimate = originalEstimate

      // Apply optimization strategies
      const strategies = [
        () => this.optimizeWithProfile(contractName, methodName, originalEstimate),
        () => this.optimizeGasLimit(originalEstimate),
        () => this.optimizeBasedOnNetworkConditions(originalEstimate)
      ]

      for (const strategy of strategies) {
        const result = await strategy()
        if (result.estimate < optimizedEstimate) {
          optimizedEstimate = result.estimate
          recommendations.push(...result.recommendations)
        }
      }

      const savings = originalEstimate - optimizedEstimate
      const savingsPercentage = Number(savings * BigInt(100) / originalEstimate)

      return {
        originalEstimate,
        optimizedEstimate,
        savings,
        savingsPercentage,
        recommendations
      }
    } catch (error) {
      console.error('Gas optimization failed:', error)
      throw error
    }
  }

  // Optimize gas limit based on historical data
  private async optimizeWithProfile(
    contractName: string,
    methodName: string,
    estimate: bigint
  ): Promise<{ estimate: bigint; recommendations: string[] }> {
    const profileKey = `${contractName}.${methodName}`
    const profile = this.gasProfiles.get(profileKey)

    if (profile && profile.callCount > 5) {
      // Use historical average with small buffer
      const historicalEstimate = profile.averageGas + (profile.averageGas / BigInt(20)) // 5% buffer
      
      if (historicalEstimate < estimate) {
        return {
          estimate: historicalEstimate,
          recommendations: [
            `Using historical data: average gas for ${methodName} is ${profile.averageGas.toString()}`
          ]
        }
      }
    }

    return {
      estimate,
      recommendations: []
    }
  }

  // Optimize gas limit with safety buffers
  private async optimizeGasLimit(
    estimate: bigint
  ): Promise<{ estimate: bigint; recommendations: string[] }> {
    // Apply standard buffer (10% instead of default 20%)
    const optimizedEstimate = estimate + (estimate / BigInt(10))
    
    return {
      estimate: optimizedEstimate,
      recommendations: [
        'Applied 10% gas buffer instead of default 20%'
      ]
    }
  }

  // Optimize based on current network conditions
  private async optimizeBasedOnNetworkConditions(
    estimate: bigint
  ): Promise<{ estimate: bigint; recommendations: string[] }> {
    try {
      const feeData = await this.provider.getFeeData()
      const latestBlock = await this.provider.getBlock('latest')
      
      if (!latestBlock) {
        return { estimate, recommendations: [] }
      }

      // Calculate block utilization
      const utilization = Number(latestBlock.gasUsed) / Number(latestBlock.gasLimit)
      
      let multiplier = 1.1 // Default 10% buffer
      const recommendations: string[] = []

      if (utilization < 0.5) {
        // Low congestion - can be more aggressive
        multiplier = 1.05
        recommendations.push('Low network congestion detected - using smaller gas buffer')
      } else if (utilization > 0.9) {
        // High congestion - need larger buffer
        multiplier = 1.2
        recommendations.push('High network congestion detected - using larger gas buffer')
      }

      const optimizedEstimate = BigInt(Math.floor(Number(estimate) * multiplier))

      return {
        estimate: optimizedEstimate,
        recommendations
      }
    } catch (error) {
      console.error('Failed to optimize based on network conditions:', error)
      return { estimate, recommendations: [] }
    }
  }

  // Record actual gas usage for profiling
  async recordGasUsage(
    contractName: string,
    methodName: string,
    gasUsed: bigint
  ) {
    const profileKey = `${contractName}.${methodName}`
    const existing = this.gasProfiles.get(profileKey)

    if (existing) {
      // Update existing profile
      const newCount = existing.callCount + 1
      const newTotal = existing.totalGasUsed + gasUsed
      const newAverage = newTotal / BigInt(newCount)

      const updated: GasProfile = {
        ...existing,
        averageGas: newAverage,
        minGas: gasUsed < existing.minGas ? gasUsed : existing.minGas,
        maxGas: gasUsed > existing.maxGas ? gasUsed : existing.maxGas,
        callCount: newCount,
        totalGasUsed: newTotal,
        lastUpdated: Date.now()
      }

      this.gasProfiles.set(profileKey, updated)
    } else {
      // Create new profile
      const newProfile: GasProfile = {
        contractName,
        methodName,
        averageGas: gasUsed,
        minGas: gasUsed,
        maxGas: gasUsed,
        callCount: 1,
        totalGasUsed: gasUsed,
        lastUpdated: Date.now()
      }

      this.gasProfiles.set(profileKey, newProfile)
    }
  }

  // Get gas profile for a method
  getGasProfile(contractName: string, methodName: string): GasProfile | null {
    const profileKey = `${contractName}.${methodName}`
    return this.gasProfiles.get(profileKey) || null
  }

  // Get all gas profiles
  getAllGasProfiles(): GasProfile[] {
    return Array.from(this.gasProfiles.values())
  }

  // Batch transaction optimization
  async optimizeBatchTransactions(
    transactions: BatchTransactionRequest[]
  ): Promise<{
    totalGasEstimate: bigint
    optimizedGasEstimate: bigint
    savings: bigint
    individualEstimates: Array<{
      originalEstimate: bigint
      optimizedEstimate: bigint
      contractName: string
      methodName: string
    }>
  }> {
    const individualEstimates = []
    let totalOriginal = BigInt(0)
    let totalOptimized = BigInt(0)

    for (const tx of transactions) {
      try {
        const optimization = await this.optimizeTransaction(
          tx.contractName,
          tx.methodName,
          tx.args,
          tx.value
        )

        individualEstimates.push({
          originalEstimate: optimization.originalEstimate,
          optimizedEstimate: optimization.optimizedEstimate,
          contractName: tx.contractName,
          methodName: tx.methodName
        })

        totalOriginal += optimization.originalEstimate
        totalOptimized += optimization.optimizedEstimate
      } catch (error) {
        console.error(`Failed to optimize transaction ${tx.contractName}.${tx.methodName}:`, error)
      }
    }

    return {
      totalGasEstimate: totalOriginal,
      optimizedGasEstimate: totalOptimized,
      savings: totalOriginal - totalOptimized,
      individualEstimates
    }
  }

  // Estimate gas cost in ETH
  async estimateTransactionCost(
    gasEstimate: bigint,
    priority: 'slow' | 'standard' | 'fast' = 'standard'
  ): Promise<{
    estimatedCost: string
    gasPrice: string
    gasPriceGwei: string
  }> {
    try {
      const feeData = await this.provider.getFeeData()
      let gasPrice = feeData.gasPrice || BigInt(0)

      // Adjust gas price based on priority
      const multiplier = {
        slow: 0.9,
        standard: 1.0,
        fast: 1.2
      }[priority]

      gasPrice = BigInt(Math.floor(Number(gasPrice) * multiplier))

      const estimatedCost = gasEstimate * gasPrice
      
      return {
        estimatedCost: ethers.formatEther(estimatedCost),
        gasPrice: gasPrice.toString(),
        gasPriceGwei: ethers.formatUnits(gasPrice, 'gwei')
      }
    } catch (error) {
      console.error('Failed to estimate transaction cost:', error)
      return {
        estimatedCost: '0',
        gasPrice: '0',
        gasPriceGwei: '0'
      }
    }
  }

  // Find optimal gas price for target confirmation time
  async findOptimalGasPrice(
    targetConfirmationMinutes: number = 2
  ): Promise<{
    gasPrice: bigint
    gasPriceGwei: string
    estimatedConfirmationTime: number
  }> {
    try {
      const feeData = await this.provider.getFeeData()
      const baseGasPrice = feeData.gasPrice || BigInt(0)

      // Simple heuristic - adjust based on target time
      // In reality, you'd want to use historical data or gas price oracles
      let multiplier = 1.0
      if (targetConfirmationMinutes <= 1) {
        multiplier = 1.5 // Fast confirmation
      } else if (targetConfirmationMinutes <= 2) {
        multiplier = 1.2 // Standard confirmation
      } else if (targetConfirmationMinutes >= 5) {
        multiplier = 0.8 // Slow confirmation
      }

      const optimalGasPrice = BigInt(Math.floor(Number(baseGasPrice) * multiplier))
      
      return {
        gasPrice: optimalGasPrice,
        gasPriceGwei: ethers.formatUnits(optimalGasPrice, 'gwei'),
        estimatedConfirmationTime: targetConfirmationMinutes
      }
    } catch (error) {
      console.error('Failed to find optimal gas price:', error)
      const fallbackPrice = BigInt(20000000000) // 20 gwei fallback
      return {
        gasPrice: fallbackPrice,
        gasPriceGwei: '20.0',
        estimatedConfirmationTime: 2
      }
    }
  }

  // Get gas optimization recommendations
  async getGeneralRecommendations(): Promise<string[]> {
    const recommendations: string[] = []

    try {
      // Check network congestion
      const latestBlock = await this.provider.getBlock('latest')
      if (latestBlock) {
        const utilization = Number(latestBlock.gasUsed) / Number(latestBlock.gasLimit)
        
        if (utilization > 0.9) {
          recommendations.push('Network is congested - consider waiting or using higher gas prices')
        } else if (utilization < 0.3) {
          recommendations.push('Network is quiet - good time for transactions with lower gas prices')
        }
      }

      // Check gas profiles for optimization opportunities
      const profiles = this.getAllGasProfiles()
      const highVarianceProfiles = profiles.filter(p => {
        const variance = Number(p.maxGas - p.minGas) / Number(p.averageGas)
        return variance > 0.5 && p.callCount > 10
      })

      if (highVarianceProfiles.length > 0) {
        recommendations.push(
          `Consider optimizing these methods with high gas variance: ${
            highVarianceProfiles.map(p => `${p.contractName}.${p.methodName}`).join(', ')
          }`
        )
      }

      // General recommendations
      recommendations.push('Use batch transactions when possible to save on gas')
      recommendations.push('Consider using CREATE2 for deterministic contract addresses')
      recommendations.push('Optimize contract code to reduce gas consumption')

    } catch (error) {
      console.error('Failed to generate recommendations:', error)
    }

    return recommendations
  }

  // Clear old gas profiles (cleanup)
  clearOldProfiles(maxAgeHours: number = 24) {
    const cutoff = Date.now() - (maxAgeHours * 60 * 60 * 1000)
    
    for (const [key, profile] of this.gasProfiles.entries()) {
      if (profile.lastUpdated < cutoff) {
        this.gasProfiles.delete(key)
      }
    }
  }

  // Export gas profiles for analysis
  exportGasProfiles(): Record<string, GasProfile> {
    const exported: Record<string, GasProfile> = {}
    
    for (const [key, profile] of this.gasProfiles.entries()) {
      exported[key] = { ...profile }
    }
    
    return exported
  }

  // Import gas profiles
  importGasProfiles(profiles: Record<string, GasProfile>) {
    for (const [key, profile] of Object.entries(profiles)) {
      this.gasProfiles.set(key, profile)
    }
  }
}

export default GasOptimizer