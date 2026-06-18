// MKFHE Type Definitions for node-seal wrapper

import type { Context, Evaluator, Encryptor, Decryptor, KeyGenerator, CipherText, PlainText, PublicKey, SecretKey, RelinKeys, GaloisKeys } from 'node-seal'

// Basic MKFHE types
export interface MKFHEKeyPair {
  publicKey: PublicKey
  secretKey: SecretKey
  partyId: string
}

export interface CombinedPublicKey {
  aggregatedKey: PublicKey
  participatingParties: string[]
  keyMetadata: {
    scheme: string
    polyModulusDegree: number
    coeffModulus: number[]
    plainModulus: number
  }
}

export interface EncryptedData {
  ciphertext: CipherText
  encryptedBy: string
  timestamp: number
  metadata: {
    dataSize: number
    scheme: string
    noiseLevel?: number
  }
}

export interface DecryptionShare {
  share: CipherText
  partyId: string
  timestamp: number
}

export interface MKFHEParameters {
  scheme: 'BFV' | 'CKKS' | 'BGV'
  polyModulusDegree: 4096 | 8192 | 16384 | 32768
  coeffModulus: number[]
  plainModulus?: number // For BFV/BGV
  scale?: number // For CKKS
  securityLevel: 128 | 192 | 256
}

export interface ComputationContext {
  context: Context
  evaluator: Evaluator
  encoder: any // PlainTextEncoder type varies by scheme
  parameters: MKFHEParameters
}

export interface MultiPartyComputation {
  inputs: EncryptedData[]
  operation: 'add' | 'multiply' | 'subtract' | 'sum' | 'mean' | 'variance'
  result?: EncryptedData
  proof?: string
  participatingParties: string[]
}

export interface KeyManagementConfig {
  threshold: number // Minimum number of parties needed for decryption
  totalParties: number // Total number of parties
  keyRotationInterval: number // In milliseconds
  keyBackupEnabled: boolean
}

// Error types
export class MKFHEError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'MKFHEError'
  }
}

export class KeyGenerationError extends MKFHEError {
  constructor(message: string) {
    super(message, 'KEY_GENERATION_ERROR')
  }
}

export class EncryptionError extends MKFHEError {
  constructor(message: string) {
    super(message, 'ENCRYPTION_ERROR')
  }
}

export class DecryptionError extends MKFHEError {
  constructor(message: string) {
    super(message, 'DECRYPTION_ERROR')
  }
}

export class ComputationError extends MKFHEError {
  constructor(message: string) {
    super(message, 'COMPUTATION_ERROR')
  }
}

// Performance monitoring types
export interface PerformanceMetrics {
  operationType: string
  duration: number
  memoryUsed?: number
  noiseGrowth?: number
  timestamp: number
}

export interface OperationProfile {
  keyGeneration: PerformanceMetrics[]
  encryption: PerformanceMetrics[]
  decryption: PerformanceMetrics[]
  computation: PerformanceMetrics[]
  aggregation: PerformanceMetrics[]
}