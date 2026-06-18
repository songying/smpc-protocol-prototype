// SMPC Processor - High-level multi-party computation operations

import { MKFHEEngine } from './engine'
import { 
  MultiPartyComputation, 
  EncryptedData, 
  MKFHEParameters,
  ComputationError,
  PerformanceMetrics
} from './types'
import { getOptimalParameters } from './config'

/**
 * Statistical computation results
 */
interface StatisticalResult {
  operation: string
  result: EncryptedData
  participatingParties: string[]
  inputCount: number
  timestamp: number
  metadata: {
    scheme: string
    noiseLevel?: number
    computationComplexity: 'low' | 'medium' | 'high'
  }
}

/**
 * SMPC Processor for high-level secure multi-party computations
 */
export class SMPCProcessor {
  private engine: MKFHEEngine
  private defaultContextId: string = 'default'
  private computationHistory: StatisticalResult[] = []

  constructor() {
    this.engine = new MKFHEEngine()
  }

  /**
   * Initialize the processor with optimal parameters
   */
  async initialize(securityLevel: number = 128, useCase: string = 'production'): Promise<void> {
    const parameters = getOptimalParameters(useCase, securityLevel)
    await this.engine.createContext(this.defaultContextId, parameters)
    console.log(`SMPC Processor initialized with ${parameters.scheme} scheme, security level ${securityLevel}`)
  }

  /**
   * Register a new party and generate their key pair
   */
  async registerParty(partyId: string): Promise<void> {
    try {
      await this.engine.generateKeyPair(partyId, this.defaultContextId)
      console.log(`Party ${partyId} registered successfully`)
    } catch (error) {
      throw new ComputationError(`Failed to register party ${partyId}: ${error}`)
    }
  }

  /**
   * Encrypt data for a specific party
   */
  async encryptData(data: number | number[], partyId: string): Promise<EncryptedData> {
    try {
      return await this.engine.encrypt(data, partyId, this.defaultContextId)
    } catch (error) {
      throw new ComputationError(`Failed to encrypt data for party ${partyId}: ${error}`)
    }
  }

  /**
   * Perform secure sum computation across multiple encrypted datasets
   */
  async computeSecureSum(encryptedInputs: EncryptedData[]): Promise<StatisticalResult> {
    const startTime = performance.now()
    
    try {
      if (encryptedInputs.length < 2) {
        throw new Error('At least 2 encrypted inputs required for sum computation')
      }

      // Start with first input
      let result = encryptedInputs[0]
      const participatingParties = [result.encryptedBy]

      // Add remaining inputs
      for (let i = 1; i < encryptedInputs.length; i++) {
        result = await this.engine.homomorphicAdd(result, encryptedInputs[i], this.defaultContextId)
        participatingParties.push(encryptedInputs[i].encryptedBy)
      }

      const computation: StatisticalResult = {
        operation: 'sum',
        result,
        participatingParties: Array.from(new Set(participatingParties)),
        inputCount: encryptedInputs.length,
        timestamp: Date.now(),
        metadata: {
          scheme: result.metadata.scheme,
          noiseLevel: result.metadata.noiseLevel,
          computationComplexity: encryptedInputs.length > 10 ? 'high' : 'medium'
        }
      }

      this.computationHistory.push(computation)
      
      const duration = performance.now() - startTime
      console.log(`Secure sum computation completed in ${duration.toFixed(2)}ms`)
      
      return computation
    } catch (error) {
      throw new ComputationError(`Failed to compute secure sum: ${error}`)
    }
  }

  /**
   * Perform secure mean computation
   */
  async computeSecureMean(encryptedInputs: EncryptedData[]): Promise<StatisticalResult> {
    try {
      // First compute the sum
      const sumResult = await this.computeSecureSum(encryptedInputs)
      
      // For mean, we would need to divide by count
      // In a full implementation, this would require homomorphic division
      // For now, we simulate this by noting that division should be done after decryption
      
      const computation: StatisticalResult = {
        operation: 'mean',
        result: sumResult.result,
        participatingParties: sumResult.participatingParties,
        inputCount: encryptedInputs.length,
        timestamp: Date.now(),
        metadata: {
          scheme: sumResult.result.metadata.scheme,
          noiseLevel: sumResult.result.metadata.noiseLevel,
          computationComplexity: 'medium'
        }
      }

      this.computationHistory.push(computation)
      console.log(`Secure mean computation completed for ${encryptedInputs.length} inputs`)
      
      return computation
    } catch (error) {
      throw new ComputationError(`Failed to compute secure mean: ${error}`)
    }
  }

  /**
   * Perform secure variance computation (simplified)
   */
  async computeSecureVariance(encryptedInputs: EncryptedData[]): Promise<StatisticalResult> {
    try {
      if (encryptedInputs.length < 2) {
        throw new Error('At least 2 inputs required for variance computation')
      }

      // Simplified variance computation: sum of squares
      // In a full implementation, this would compute (x - mean)^2 for each x
      let sumOfSquares = await this.engine.homomorphicMultiply(
        encryptedInputs[0], 
        encryptedInputs[0], 
        this.defaultContextId
      )

      for (let i = 1; i < encryptedInputs.length; i++) {
        const square = await this.engine.homomorphicMultiply(
          encryptedInputs[i],
          encryptedInputs[i],
          this.defaultContextId
        )
        sumOfSquares = await this.engine.homomorphicAdd(sumOfSquares, square, this.defaultContextId)
      }

      const computation: StatisticalResult = {
        operation: 'variance',
        result: sumOfSquares,
        participatingParties: encryptedInputs.map(input => input.encryptedBy),
        inputCount: encryptedInputs.length,
        timestamp: Date.now(),
        metadata: {
          scheme: sumOfSquares.metadata.scheme,
          noiseLevel: sumOfSquares.metadata.noiseLevel,
          computationComplexity: 'high'
        }
      }

      this.computationHistory.push(computation)
      console.log(`Secure variance computation completed for ${encryptedInputs.length} inputs`)
      
      return computation
    } catch (error) {
      throw new ComputationError(`Failed to compute secure variance: ${error}`)
    }
  }

  /**
   * Perform custom computation using a script-like interface
   */
  async performCustomComputation(
    encryptedInputs: EncryptedData[],
    operation: 'add' | 'multiply' | 'sum' | 'mean' | 'variance'
  ): Promise<StatisticalResult> {
    switch (operation) {
      case 'sum':
        return await this.computeSecureSum(encryptedInputs)
      case 'mean':
        return await this.computeSecureMean(encryptedInputs)
      case 'variance':
        return await this.computeSecureVariance(encryptedInputs)
      case 'add':
        if (encryptedInputs.length !== 2) {
          throw new Error('Add operation requires exactly 2 inputs')
        }
        const addResult = await this.engine.homomorphicAdd(encryptedInputs[0], encryptedInputs[1], this.defaultContextId)
        const addComputation: StatisticalResult = {
          operation: 'add',
          result: addResult,
          participatingParties: [encryptedInputs[0].encryptedBy, encryptedInputs[1].encryptedBy],
          inputCount: 2,
          timestamp: Date.now(),
          metadata: {
            scheme: addResult.metadata.scheme,
            noiseLevel: addResult.metadata.noiseLevel,
            computationComplexity: 'low'
          }
        }
        this.computationHistory.push(addComputation)
        return addComputation
      case 'multiply':
        if (encryptedInputs.length !== 2) {
          throw new Error('Multiply operation requires exactly 2 inputs')
        }
        const multiplyResult = await this.engine.homomorphicMultiply(encryptedInputs[0], encryptedInputs[1], this.defaultContextId)
        const multiplyComputation: StatisticalResult = {
          operation: 'multiply',
          result: multiplyResult,
          participatingParties: [encryptedInputs[0].encryptedBy, encryptedInputs[1].encryptedBy],
          inputCount: 2,
          timestamp: Date.now(),
          metadata: {
            scheme: multiplyResult.metadata.scheme,
            noiseLevel: multiplyResult.metadata.noiseLevel,
            computationComplexity: 'medium'
          }
        }
        this.computationHistory.push(multiplyComputation)
        return multiplyComputation
      default:
        throw new ComputationError(`Unsupported operation: ${operation}`)
    }
  }

  /**
   * Decrypt computation result
   */
  async decryptResult(result: StatisticalResult, partyId: string): Promise<{
    operation: string
    plaintext: number[]
    metadata: any
  }> {
    try {
      const plaintext = await this.engine.decrypt(result.result, partyId, this.defaultContextId)
      
      // For mean operations, divide by input count
      let processedResult = plaintext
      if (result.operation === 'mean' && result.inputCount > 1) {
        processedResult = plaintext.map(value => value / result.inputCount)
      }

      return {
        operation: result.operation,
        plaintext: processedResult,
        metadata: {
          participatingParties: result.participatingParties,
          inputCount: result.inputCount,
          computationComplexity: result.metadata.computationComplexity,
          decryptedBy: partyId,
          timestamp: Date.now()
        }
      }
    } catch (error) {
      throw new ComputationError(`Failed to decrypt result: ${error}`)
    }
  }

  /**
   * Get computation history
   */
  getComputationHistory(): StatisticalResult[] {
    return [...this.computationHistory]
  }

  /**
   * Get performance metrics from the underlying engine
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.engine.getPerformanceMetrics()
  }

  /**
   * Clear computation history and performance metrics
   */
  clearHistory(): void {
    this.computationHistory = []
    this.engine.clearPerformanceMetrics()
  }

  /**
   * Simulate a complete multi-party computation workflow
   */
  async simulateMultiPartyWorkflow(
    parties: string[],
    dataPoints: number[][],
    operation: 'sum' | 'mean' | 'variance'
  ): Promise<{
    computation: StatisticalResult
    decryptedResult: any
  }> {
    try {
      console.log(`Starting multi-party ${operation} computation with ${parties.length} parties`)

      // Register all parties
      for (const partyId of parties) {
        await this.registerParty(partyId)
      }

      // Encrypt data for each party
      const encryptedInputs: EncryptedData[] = []
      for (let i = 0; i < parties.length; i++) {
        const encrypted = await this.encryptData(dataPoints[i], parties[i])
        encryptedInputs.push(encrypted)
      }

      // Perform computation
      const computation = await this.performCustomComputation(encryptedInputs, operation)

      // Decrypt result using the first party's key
      const decryptedResult = await this.decryptResult(computation, parties[0])

      console.log(`Multi-party ${operation} computation completed successfully`)

      return {
        computation,
        decryptedResult
      }
    } catch (error) {
      throw new ComputationError(`Failed to complete multi-party workflow: ${error}`)
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.engine.cleanup()
    this.computationHistory = []
    console.log('SMPC Processor cleanup completed')
  }
}