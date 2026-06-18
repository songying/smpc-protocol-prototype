// MKFHE Library Main Exports

export { MKFHEEngine } from './engine'
export { SMPCProcessor } from './smpc-processor'
export { runFheAggregation } from './aggregate'
export type { FheResult, FheOperation } from './aggregate'

// DKG (Distributed Key Generation) exports
export {
  DKGManager,
  ShamirSecretSharing,
  SecureKeyStorage,
  ThresholdDecryptionEngine,
  createDKGSystem,
  validateDKGParameters,
  estimateDKGPerformance,
  checkDKGCompatibility,
  DKG_CONSTANTS,
  DKG_PARAMETER_SETS
} from './dkg'

export type {
  MKFHEKeyPair,
  CombinedPublicKey,
  EncryptedData,
  DecryptionShare,
  MKFHEParameters,
  ComputationContext,
  MultiPartyComputation,
  KeyManagementConfig,
  PerformanceMetrics,
  OperationProfile
} from './types'

// DKG type exports
export type {
  DKGParticipant,
  DKGSession,
  SecretShare,
  KeyShare,
  DKGCommitment,
  ThresholdDecryption,
  DKGRound,
  KeyRotationSession,
  DKGConfig,
  ShamirConfig,
  DKGMessage,
  NetworkProtocol,
  StoredKey,
  StorageConfig,
  KeyMetrics,
  DKGError,
  ThresholdError,
  VerificationError,
  ShareReconstructionError
} from './dkg'

export {
  MKFHEError,
  KeyGenerationError,
  EncryptionError,
  DecryptionError,
  ComputationError
} from './types'

export {
  PARAMETER_SETS,
  DEFAULT_KEY_CONFIG,
  PERFORMANCE_CONFIG,
  SECURITY_CONFIG,
  NETWORK_CONFIG,
  ParameterValidator,
  getOptimalParameters,
  estimateMemoryUsage
} from './config'

// Re-export useful constants
export const MKFHE_VERSION = '1.0.0'
export const SUPPORTED_SCHEMES = ['BFV', 'BGV', 'CKKS'] as const
export const SUPPORTED_SECURITY_LEVELS = [128, 192, 256] as const

/**
 * Factory function to create and initialize an SMPC processor
 */
export async function createSMPCProcessor(
  securityLevel: number = 128,
  useCase: string = 'production'
): Promise<SMPCProcessor> {
  const { SMPCProcessor } = await import('./smpc-processor')
  const processor = new SMPCProcessor()
  await processor.initialize(securityLevel, useCase)
  return processor
}

/**
 * Factory function to create an MKFHE engine
 */
export function createMKFHEEngine(): MKFHEEngine {
  return new MKFHEEngine()
}

/**
 * Utility function to validate if the environment supports MKFHE operations
 */
export function checkEnvironmentSupport(): {
  supported: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []

  // Check WebAssembly support
  if (typeof WebAssembly === 'undefined') {
    issues.push('WebAssembly not supported')
    recommendations.push('Use a modern browser or Node.js version that supports WebAssembly')
  }

  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined'
  const isNode = typeof process !== 'undefined' && process.versions?.node

  if (!isBrowser && !isNode) {
    issues.push('Unknown JavaScript environment')
    recommendations.push('Ensure running in Node.js or modern browser')
  }

  // Check memory availability (rough estimate)
  if (isBrowser && 'memory' in performance) {
    const memory = (performance as any).memory
    if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
      issues.push('High memory usage detected')
      recommendations.push('Consider freeing memory before MKFHE operations')
    }
  }

  // Check Node.js version if applicable
  if (isNode) {
    const nodeVersion = parseInt(process.versions.node.split('.')[0])
    if (nodeVersion < 14) {
      issues.push('Node.js version too old')
      recommendations.push('Upgrade to Node.js 14 or later for optimal WebAssembly support')
    }
  }

  return {
    supported: issues.length === 0,
    issues,
    recommendations
  }
}

/**
 * Utility function to get recommended parameters for specific use cases
 */
export function getRecommendedConfig(useCase: 'development' | 'testing' | 'production' | 'high-security') {
  const configs = {
    development: {
      parameters: PARAMETER_SETS.development,
      keyConfig: { ...DEFAULT_KEY_CONFIG, threshold: 1, totalParties: 2 },
      securityLevel: 128
    },
    testing: {
      parameters: PARAMETER_SETS.development,
      keyConfig: { ...DEFAULT_KEY_CONFIG, threshold: 2, totalParties: 3 },
      securityLevel: 128
    },
    production: {
      parameters: PARAMETER_SETS.production_standard,
      keyConfig: DEFAULT_KEY_CONFIG,
      securityLevel: 128
    },
    'high-security': {
      parameters: PARAMETER_SETS.high_security,
      keyConfig: { ...DEFAULT_KEY_CONFIG, threshold: 3, totalParties: 5 },
      securityLevel: 192
    }
  }

  return configs[useCase]
}