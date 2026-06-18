// DKG (Distributed Key Generation) Module Exports
// Main entry point for multi-party key generation functionality

export { DKGManager } from './dkg-manager'
export { ShamirSecretSharing } from './shamir'
export { SecureKeyStorage } from './key-storage'
export { ThresholdDecryptionEngine } from './threshold-decryption'

export type {
  DKGParticipant,
  DKGSession,
  SecretShare,
  KeyShare,
  DKGCommitment,
  ThresholdDecryption,
  DecryptionShare,
  DKGRound,
  KeyRotationSession,
  DKGConfig,
  ShamirConfig,
  DKGMessage,
  NetworkProtocol,
  StoredKey,
  StorageConfig,
  KeyMetrics
} from './types'

export {
  DKGError,
  ThresholdError,
  VerificationError,
  ShareReconstructionError
} from './types'

// Constants and configurations
export const DKG_CONSTANTS = {
  MIN_THRESHOLD: 2,
  MAX_PARTIES: 100,
  DEFAULT_SESSION_TIMEOUT: 300000, // 5 minutes
  DEFAULT_ROUND_TIMEOUT: 60000,    // 1 minute
  DEFAULT_SECURITY_LEVEL: 128,
  DEFAULT_KEY_ROTATION_INTERVAL: 3600000 // 1 hour
} as const

export const DKG_PARAMETER_SETS = {
  development: {
    threshold: 2,
    maxParties: 5,
    sessionTimeout: 60000,
    enableProofs: false,
    autoRotation: false
  },
  testing: {
    threshold: 3,
    maxParties: 10,
    sessionTimeout: 180000,
    enableProofs: true,
    autoRotation: false
  },
  production: {
    threshold: 5,
    maxParties: 50,
    sessionTimeout: 300000,
    enableProofs: true,
    autoRotation: true
  },
  'high-security': {
    threshold: 7,
    maxParties: 21,
    sessionTimeout: 600000,
    enableProofs: true,
    autoRotation: true
  }
} as const

/**
 * Factory function to create a complete DKG system
 */
export async function createDKGSystem(
  environment: 'development' | 'testing' | 'production' | 'high-security' = 'production'
): Promise<{
  dkgManager: DKGManager
  keyStorage: SecureKeyStorage
  thresholdDecryption: ThresholdDecryptionEngine
  shamirSS: ShamirSecretSharing
}> {
  const paramSet = DKG_PARAMETER_SETS[environment]
  
  // Import classes dynamically to avoid circular dependency issues
  const { SecureKeyStorage } = await import('./key-storage')
  const { DKGManager } = await import('./dkg-manager')
  const { ThresholdDecryptionEngine } = await import('./threshold-decryption')
  const { ShamirSecretSharing } = await import('./shamir')
  
  // Create key storage with environment-specific configuration
  const keyStorage = new SecureKeyStorage({
    maxStorageSize: environment === 'development' ? 10 * 1024 * 1024 : 100 * 1024 * 1024,
    autoRotationEnabled: paramSet.autoRotation,
    auditEnabled: environment !== 'development'
  })

  // Create DKG manager with configuration
  const dkgManager = new DKGManager({
    defaultThreshold: paramSet.threshold,
    maxParties: paramSet.maxParties,
    sessionTimeout: paramSet.sessionTimeout,
    enableProofs: paramSet.enableProofs,
    keyRotationInterval: DKG_CONSTANTS.DEFAULT_KEY_ROTATION_INTERVAL
  })

  // Create threshold decryption engine
  const thresholdDecryption = new ThresholdDecryptionEngine(keyStorage)

  // Create Shamir's Secret Sharing with appropriate prime
  const shamirSS = new ShamirSecretSharing({
    prime: environment === 'high-security' 
      ? BigInt('170141183460469231731687303715884105727') // 2^127 - 1
      : BigInt('2147483647') // 2^31 - 1
  })

  console.log(`DKG system initialized for ${environment} environment`)
  
  return {
    dkgManager,
    keyStorage,
    thresholdDecryption,
    shamirSS
  }
}

/**
 * Utility function to validate DKG parameters
 */
export function validateDKGParameters(params: {
  threshold: number
  totalParties: number
  sessionTimeout?: number
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (params.threshold < DKG_CONSTANTS.MIN_THRESHOLD) {
    errors.push(`Threshold must be at least ${DKG_CONSTANTS.MIN_THRESHOLD}`)
  }

  if (params.threshold > params.totalParties) {
    errors.push('Threshold cannot exceed total number of parties')
  }

  if (params.totalParties > DKG_CONSTANTS.MAX_PARTIES) {
    errors.push(`Total parties cannot exceed ${DKG_CONSTANTS.MAX_PARTIES}`)
  }

  if (params.sessionTimeout && params.sessionTimeout < 10000) {
    errors.push('Session timeout must be at least 10 seconds')
  }

  // Security recommendation: threshold should be > 50% of parties
  if (params.threshold <= Math.floor(params.totalParties / 2)) {
    errors.push('Warning: Threshold should be greater than 50% of total parties for security')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Utility function to estimate DKG performance
 */
export function estimateDKGPerformance(params: {
  threshold: number
  totalParties: number
  dataSize: number
}): {
  estimatedTime: number
  memoryUsage: number
  networkRounds: number
  recommendations: string[]
} {
  const { threshold, totalParties, dataSize } = params
  
  // Simplified performance estimation
  const baseTime = 1000 // 1 second base
  const partyFactor = totalParties * 100 // 100ms per party
  const thresholdFactor = threshold * 50 // 50ms per threshold unit
  const dataFactor = Math.log(dataSize + 1) * 10 // Logarithmic data scaling
  
  const estimatedTime = baseTime + partyFactor + thresholdFactor + dataFactor
  
  const memoryUsage = totalParties * threshold * 1024 + dataSize // Rough estimate in bytes
  
  const networkRounds = 3 + Math.ceil(totalParties / 10) // Base rounds + scaling
  
  const recommendations: string[] = []
  
  if (totalParties > 20) {
    recommendations.push('Consider batching operations for large party counts')
  }
  
  if (threshold > totalParties * 0.8) {
    recommendations.push('High threshold ratio may impact availability')
  }
  
  if (dataSize > 1024 * 1024) {
    recommendations.push('Large data size may require compression')
  }

  return {
    estimatedTime,
    memoryUsage,
    networkRounds,
    recommendations
  }
}

/**
 * Check system compatibility for DKG operations
 */
export function checkDKGCompatibility(): {
  compatible: boolean
  issues: string[]
  capabilities: string[]
} {
  const issues: string[] = []
  const capabilities: string[] = []

  // Check WebAssembly support
  if (typeof WebAssembly === 'undefined') {
    issues.push('WebAssembly not supported')
  } else {
    capabilities.push('WebAssembly support')
  }

  // Check crypto API
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    issues.push('Crypto API not available')
  } else {
    capabilities.push('Cryptographically secure random number generation')
  }

  // Check BigInt support
  if (typeof BigInt === 'undefined') {
    issues.push('BigInt not supported')
  } else {
    capabilities.push('Large integer arithmetic')
  }

  // Check performance API
  if (typeof performance === 'undefined') {
    issues.push('Performance API not available (metrics will be limited)')
  } else {
    capabilities.push('Performance monitoring')
  }

  // Check environment
  const isBrowser = typeof window !== 'undefined'
  const isNode = typeof process !== 'undefined' && process.versions?.node

  if (isBrowser) {
    capabilities.push('Browser environment')
    
    // Check for SharedArrayBuffer (for advanced parallelization)
    if (typeof SharedArrayBuffer !== 'undefined') {
      capabilities.push('Shared memory support')
    }
  }

  if (isNode) {
    capabilities.push('Node.js environment')
    
    // Check Node.js version
    if (isNode) {
      const nodeVersion = parseInt(process.versions.node.split('.')[0])
      if (nodeVersion >= 14) {
        capabilities.push('Modern Node.js (v14+)')
      } else {
        issues.push('Node.js version too old (requires v14+)')
      }
    }
  }

  return {
    compatible: issues.length === 0,
    issues,
    capabilities
  }
}