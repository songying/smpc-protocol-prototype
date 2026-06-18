// MKFHE Configuration and Parameter Management

import { MKFHEParameters, ComputationContext, KeyManagementConfig } from './types'

/**
 * Predefined secure parameter sets for different security levels and use cases
 */
export const PARAMETER_SETS: Record<string, MKFHEParameters> = {
  // Development/Testing - Lower security, faster operations
  'development': {
    scheme: 'BFV',
    polyModulusDegree: 4096,
    coeffModulus: [60, 40, 40, 60],
    plainModulus: 1024,
    securityLevel: 128
  },

  // Production - Standard security
  'production_standard': {
    scheme: 'BFV', 
    polyModulusDegree: 8192,
    coeffModulus: [60, 40, 40, 40, 40, 60],
    plainModulus: 65537,
    securityLevel: 128
  },

  // High Security - Maximum security for sensitive data
  'high_security': {
    scheme: 'BFV',
    polyModulusDegree: 16384,
    coeffModulus: [60, 50, 50, 50, 50, 50, 50, 60],
    plainModulus: 65537,
    securityLevel: 192
  },

  // CKKS for floating point operations
  'ckks_standard': {
    scheme: 'CKKS',
    polyModulusDegree: 8192,
    coeffModulus: [60, 40, 40, 40, 40, 60],
    scale: Math.pow(2, 40),
    securityLevel: 128
  },

  // BGV for integer operations with batching
  'bgv_batched': {
    scheme: 'BGV',
    polyModulusDegree: 8192,
    coeffModulus: [60, 40, 40, 40, 40, 60],
    plainModulus: 65537,
    securityLevel: 128
  }
}

/**
 * Default key management configuration
 */
export const DEFAULT_KEY_CONFIG: KeyManagementConfig = {
  threshold: 2, // Minimum 2 parties for decryption
  totalParties: 3, // Default 3-party computation
  keyRotationInterval: 24 * 60 * 60 * 1000, // 24 hours
  keyBackupEnabled: true
}

/**
 * Performance optimization settings
 */
export const PERFORMANCE_CONFIG = {
  // Memory management
  maxConcurrentOperations: 10,
  garbageCollectionInterval: 5000, // 5 seconds
  
  // Computation optimization  
  batchingEnabled: true,
  parallelOperations: true,
  
  // Caching
  cacheEnabled: true,
  maxCacheSize: 100, // Number of cached results
  cacheExpirationTime: 60000, // 1 minute
  
  // Monitoring
  performanceLogging: true,
  detailedMetrics: false // Set to true for development
}

/**
 * Security configuration
 */
export const SECURITY_CONFIG = {
  // Key security
  keyDerivationIterations: 100000,
  keyStretchingEnabled: true,
  
  // Randomness
  secureRandomEnabled: true,
  entropySource: 'system', // 'system' or 'manual'
  
  // Validation
  parameterValidation: true,
  noiseAnalysis: true,
  
  // Access control
  strictKeyValidation: true,
  auditLogging: true
}

/**
 * Network configuration for multi-party operations
 */
export const NETWORK_CONFIG = {
  // Communication timeouts
  connectionTimeout: 30000, // 30 seconds
  operationTimeout: 300000, // 5 minutes
  
  // Retry logic
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  
  // Bandwidth optimization
  compressionEnabled: true,
  batchCommunication: true,
  
  // Security
  tlsRequired: true,
  certificateValidation: true
}

/**
 * Validation functions for parameters
 */
export class ParameterValidator {
  static validateParameters(params: MKFHEParameters): boolean {
    // Validate polynomial modulus degree
    const validDegrees = [4096, 8192, 16384, 32768]
    if (!validDegrees.includes(params.polyModulusDegree)) {
      throw new Error(`Invalid polynomial modulus degree: ${params.polyModulusDegree}`)
    }

    // Validate coefficient modulus
    if (!params.coeffModulus || params.coeffModulus.length < 2) {
      throw new Error('Coefficient modulus must have at least 2 elements')
    }

    // Validate security level
    const validSecurityLevels = [128, 192, 256]
    if (!validSecurityLevels.includes(params.securityLevel)) {
      throw new Error(`Invalid security level: ${params.securityLevel}`)
    }

    // Scheme-specific validation
    switch (params.scheme) {
      case 'BFV':
      case 'BGV':
        if (!params.plainModulus || params.plainModulus < 2) {
          throw new Error('Plain modulus must be at least 2 for BFV/BGV scheme')
        }
        break
      case 'CKKS':
        if (!params.scale || params.scale <= 0) {
          throw new Error('Scale must be positive for CKKS scheme')
        }
        break
      default:
        throw new Error(`Unsupported scheme: ${params.scheme}`)
    }

    return true
  }

  static validateKeyConfig(config: KeyManagementConfig): boolean {
    if (config.threshold < 1 || config.threshold > config.totalParties) {
      throw new Error('Threshold must be between 1 and total parties')
    }

    if (config.totalParties < 1 || config.totalParties > 100) {
      throw new Error('Total parties must be between 1 and 100')
    }

    if (config.keyRotationInterval < 60000) { // Minimum 1 minute
      throw new Error('Key rotation interval must be at least 1 minute')
    }

    return true
  }
}

/**
 * Helper function to get optimal parameters based on use case
 */
export function getOptimalParameters(useCase: string, securityLevel: number = 128): MKFHEParameters {
  if (useCase === 'development' || useCase === 'testing') {
    return PARAMETER_SETS.development
  }

  if (securityLevel >= 192) {
    return PARAMETER_SETS.high_security
  }

  return PARAMETER_SETS.production_standard
}

/**
 * Helper function to estimate memory usage for given parameters
 */
export function estimateMemoryUsage(params: MKFHEParameters): {
  keySize: number
  ciphertextSize: number
  plaintextSize: number
} {
  const degreeBytes = params.polyModulusDegree * 8 // 8 bytes per coefficient
  const modCount = params.coeffModulus.length
  
  return {
    keySize: degreeBytes * modCount * 2, // Public + secret key
    ciphertextSize: degreeBytes * modCount * 2, // Two polynomials
    plaintextSize: degreeBytes
  }
}