// MKFHE Engine - Core implementation using node-seal

import SEAL from 'node-seal'
import { 
  MKFHEKeyPair, 
  CombinedPublicKey, 
  EncryptedData, 
  DecryptionShare,
  MKFHEParameters, 
  ComputationContext,
  KeyGenerationError,
  EncryptionError,
  DecryptionError,
  ComputationError,
  PerformanceMetrics
} from './types'
import { ParameterValidator, PARAMETER_SETS } from './config'

/**
 * Multi-Key Fully Homomorphic Encryption Engine
 * Built on top of Microsoft SEAL via node-seal
 */
export class MKFHEEngine {
  private seal: any = null
  private contexts: Map<string, ComputationContext> = new Map()
  private keyPairs: Map<string, MKFHEKeyPair> = new Map()
  private performanceMetrics: PerformanceMetrics[] = []
  private isInitialized: boolean = false
  private initializationPromise: Promise<void> | null = null

  constructor() {
    // Don't call initializeSEAL() in constructor - it will be called when needed
  }

  /**
   * Initialize the SEAL library
   */
  private async initializeSEAL(): Promise<void> {
    try {
      this.seal = await SEAL()
      this.isInitialized = true
      
      // Check if SEAL library has the expected methods
      if (typeof this.seal.versionMajor === 'function' && 
          typeof this.seal.versionMinor === 'function' && 
          typeof this.seal.versionPatch === 'function') {
        console.log('MKFHE Engine initialized with SEAL version:', 
          this.seal.versionMajor(), this.seal.versionMinor(), this.seal.versionPatch())
      } else {
        console.log('MKFHE Engine initialized with node-seal (version methods not available)')
      }
    } catch (error) {
      this.isInitialized = false
      throw new Error(`Failed to initialize SEAL: ${error}`)
    }
  }

  /**
   * Ensure SEAL is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      // Use a promise to ensure only one initialization happens
      if (!this.initializationPromise) {
        this.initializationPromise = this.initializeSEAL()
      }
      await this.initializationPromise
    }
  }

  /**
   * Create computation context with given parameters
   */
  async createContext(contextId: string, parameters: MKFHEParameters): Promise<ComputationContext> {
    await this.ensureInitialized()
    
    const startTime = performance.now()
    
    try {
      // Validate parameters
      ParameterValidator.validateParameters(parameters)

      // Create encryption parameters
      const encParms = this.seal.EncryptionParameters(this.seal.SchemeType[parameters.scheme])
      encParms.setPolyModulusDegree(parameters.polyModulusDegree)
      
      // Set coefficient modulus
      const coeffModulus = this.seal.CoeffModulus.Create(
        parameters.polyModulusDegree,
        new Int32Array(parameters.coeffModulus)
      )
      encParms.setCoeffModulus(coeffModulus)

      // Set scheme-specific parameters
      if (parameters.scheme === 'BFV' || parameters.scheme === 'BGV') {
        encParms.setPlainModulus(parameters.plainModulus!)
      }

      // Create context
      const context = this.seal.Context(encParms, true, this.seal.SecurityLevel.tc128)
      
      if (!context.parametersSet()) {
        throw new Error('Invalid encryption parameters')
      }

      // Create evaluator
      const evaluator = this.seal.Evaluator(context)

      // Create encoder based on scheme
      let encoder
      switch (parameters.scheme) {
        case 'BFV':
        case 'BGV':
          encoder = this.seal.IntegerEncoder(context)
          break
        case 'CKKS':
          encoder = this.seal.CKKSEncoder(context)
          break
        default:
          throw new Error(`Unsupported scheme: ${parameters.scheme}`)
      }

      const computationContext: ComputationContext = {
        context,
        evaluator,
        encoder,
        parameters
      }

      this.contexts.set(contextId, computationContext)

      // Record performance metrics
      const duration = performance.now() - startTime
      this.recordMetrics('contextCreation', duration)

      return computationContext
    } catch (error) {
      throw new KeyGenerationError(`Failed to create context: ${error}`)
    }
  }

  /**
   * Generate a key pair for a party
   */
  async generateKeyPair(partyId: string, contextId: string): Promise<MKFHEKeyPair> {
    await this.ensureInitialized()
    
    const startTime = performance.now()
    
    try {
      const context = this.contexts.get(contextId)
      if (!context) {
        throw new Error(`Context ${contextId} not found`)
      }

      const keyGen = this.seal.KeyGenerator(context.context)
      const secretKey = keyGen.secretKey()
      const publicKey = keyGen.createPublicKey()

      const keyPair: MKFHEKeyPair = {
        publicKey,
        secretKey,
        partyId
      }

      this.keyPairs.set(partyId, keyPair)

      // Record performance metrics
      const duration = performance.now() - startTime
      this.recordMetrics('keyGeneration', duration)

      return keyPair
    } catch (error) {
      throw new KeyGenerationError(`Failed to generate key pair for party ${partyId}: ${error}`)
    }
  }

  /**
   * Simulate key aggregation for multi-party operations
   * Note: This is a simplified version - real MKFHE would require more sophisticated key combination
   */
  async aggregatePublicKeys(partyIds: string[], contextId: string): Promise<CombinedPublicKey> {
    await this.ensureInitialized()
    
    try {
      const context = this.contexts.get(contextId)
      if (!context) {
        throw new Error(`Context ${contextId} not found`)
      }

      // For demonstration, we'll use the first party's public key as the "aggregated" key
      // In a real MKFHE scheme, this would involve cryptographic key combination
      const firstPartyKey = this.keyPairs.get(partyIds[0])
      if (!firstPartyKey) {
        throw new Error(`Key pair for party ${partyIds[0]} not found`)
      }

      const combinedKey: CombinedPublicKey = {
        aggregatedKey: firstPartyKey.publicKey,
        participatingParties: [...partyIds],
        keyMetadata: {
          scheme: context.parameters.scheme,
          polyModulusDegree: context.parameters.polyModulusDegree,
          coeffModulus: context.parameters.coeffModulus,
          plainModulus: context.parameters.plainModulus || 0
        }
      }

      return combinedKey
    } catch (error) {
      throw new KeyGenerationError(`Failed to aggregate public keys: ${error}`)
    }
  }

  /**
   * Encrypt data using a party's key
   */
  async encrypt(data: number | number[], partyId: string, contextId: string): Promise<EncryptedData> {
    await this.ensureInitialized()
    
    const startTime = performance.now()
    
    try {
      const context = this.contexts.get(contextId)
      const keyPair = this.keyPairs.get(partyId)
      
      if (!context || !keyPair) {
        throw new Error('Context or key pair not found')
      }

      const encryptor = this.seal.Encryptor(context.context, keyPair.publicKey)
      
      // Encode the data
      let plaintext
      if (context.parameters.scheme === 'CKKS') {
        // For CKKS, handle floating-point data
        const dataArray = Array.isArray(data) ? data : [data]
        plaintext = this.seal.PlainText()
        context.encoder.encode(Float64Array.from(dataArray), context.parameters.scale || Math.pow(2, 40), plaintext)
      } else {
        // For BFV/BGV, handle integer data
        plaintext = this.seal.PlainText()
        if (Array.isArray(data)) {
          context.encoder.encode(Int32Array.from(data), plaintext)
        } else {
          context.encoder.encode(data, plaintext)
        }
      }

      // Encrypt
      const ciphertext = this.seal.CipherText()
      encryptor.encrypt(plaintext, ciphertext)

      const encryptedData: EncryptedData = {
        ciphertext,
        encryptedBy: partyId,
        timestamp: Date.now(),
        metadata: {
          dataSize: Array.isArray(data) ? data.length : 1,
          scheme: context.parameters.scheme,
          noiseLevel: encryptor.invariantNoiseBudget(ciphertext)
        }
      }

      // Clean up
      plaintext.delete()

      // Record performance metrics
      const duration = performance.now() - startTime
      this.recordMetrics('encryption', duration)

      return encryptedData
    } catch (error) {
      throw new EncryptionError(`Failed to encrypt data: ${error}`)
    }
  }

  /**
   * Perform homomorphic addition on encrypted data
   */
  async homomorphicAdd(data1: EncryptedData, data2: EncryptedData, contextId: string): Promise<EncryptedData> {
    await this.ensureInitialized()
    
    const startTime = performance.now()
    
    try {
      const context = this.contexts.get(contextId)
      if (!context) {
        throw new Error(`Context ${contextId} not found`)
      }

      const result = this.seal.CipherText()
      context.evaluator.add(data1.ciphertext, data2.ciphertext, result)

      const encryptedResult: EncryptedData = {
        ciphertext: result,
        encryptedBy: `${data1.encryptedBy}+${data2.encryptedBy}`,
        timestamp: Date.now(),
        metadata: {
          dataSize: Math.max(data1.metadata.dataSize, data2.metadata.dataSize),
          scheme: context.parameters.scheme,
          noiseLevel: context.evaluator.invariantNoiseBudget ? context.evaluator.invariantNoiseBudget(result) : undefined
        }
      }

      // Record performance metrics
      const duration = performance.now() - startTime
      this.recordMetrics('homomorphicAdd', duration)

      return encryptedResult
    } catch (error) {
      throw new ComputationError(`Failed to perform homomorphic addition: ${error}`)
    }
  }

  /**
   * Perform homomorphic multiplication on encrypted data
   */
  async homomorphicMultiply(data1: EncryptedData, data2: EncryptedData, contextId: string): Promise<EncryptedData> {
    await this.ensureInitialized()
    
    const startTime = performance.now()
    
    try {
      const context = this.contexts.get(contextId)
      if (!context) {
        throw new Error(`Context ${contextId} not found`)
      }

      const result = this.seal.CipherText()
      context.evaluator.multiply(data1.ciphertext, data2.ciphertext, result)

      const encryptedResult: EncryptedData = {
        ciphertext: result,
        encryptedBy: `${data1.encryptedBy}*${data2.encryptedBy}`,
        timestamp: Date.now(),
        metadata: {
          dataSize: Math.max(data1.metadata.dataSize, data2.metadata.dataSize),
          scheme: context.parameters.scheme,
          noiseLevel: context.evaluator.invariantNoiseBudget ? context.evaluator.invariantNoiseBudget(result) : undefined
        }
      }

      // Record performance metrics
      const duration = performance.now() - startTime
      this.recordMetrics('homomorphicMultiply', duration)

      return encryptedResult
    } catch (error) {
      throw new ComputationError(`Failed to perform homomorphic multiplication: ${error}`)
    }
  }

  /**
   * Decrypt data using a party's secret key
   */
  async decrypt(encryptedData: EncryptedData, partyId: string, contextId: string): Promise<number[]> {
    await this.ensureInitialized()
    
    const startTime = performance.now()
    
    try {
      const context = this.contexts.get(contextId)
      const keyPair = this.keyPairs.get(partyId)
      
      if (!context || !keyPair) {
        throw new Error('Context or key pair not found')
      }

      const decryptor = this.seal.Decryptor(context.context, keyPair.secretKey)
      
      // Decrypt to plaintext
      const plaintext = this.seal.PlainText()
      decryptor.decrypt(encryptedData.ciphertext, plaintext)

      // Decode based on scheme
      let result: number[]
      if (context.parameters.scheme === 'CKKS') {
        const decoded = new Float64Array(encryptedData.metadata.dataSize)
        context.encoder.decode(plaintext, decoded)
        result = Array.from(decoded)
      } else {
        // For BFV/BGV
        if (encryptedData.metadata.dataSize === 1) {
          result = [context.encoder.decodeInt32(plaintext)]
        } else {
          const decoded = new Int32Array(encryptedData.metadata.dataSize)
          context.encoder.decode(plaintext, decoded)
          result = Array.from(decoded)
        }
      }

      // Clean up
      plaintext.delete()

      // Record performance metrics
      const duration = performance.now() - startTime
      this.recordMetrics('decryption', duration)

      return result
    } catch (error) {
      throw new DecryptionError(`Failed to decrypt data: ${error}`)
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics]
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics(): void {
    this.performanceMetrics = []
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(operation: string, duration: number): void {
    this.performanceMetrics.push({
      operationType: operation,
      duration,
      timestamp: Date.now()
    })

    // Keep only last 1000 metrics to prevent memory bloat
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000)
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Clean up contexts
    for (const [contextId, context] of this.contexts) {
      try {
        context.context.delete()
        context.evaluator.delete()
        context.encoder.delete()
      } catch (error) {
        console.warn(`Error cleaning up context ${contextId}:`, error)
      }
    }
    this.contexts.clear()

    // Clean up key pairs
    for (const [partyId, keyPair] of this.keyPairs) {
      try {
        keyPair.publicKey.delete()
        keyPair.secretKey.delete()
      } catch (error) {
        console.warn(`Error cleaning up key pair for party ${partyId}:`, error)
      }
    }
    this.keyPairs.clear()

    this.performanceMetrics = []
    console.log('MKFHE Engine cleanup completed')
  }

  /**
   * Get available parameter sets
   */
  static getParameterSets(): Record<string, MKFHEParameters> {
    return { ...PARAMETER_SETS }
  }
}