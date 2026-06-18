// Distributed Key Generation (DKG) Types
// Implements threshold cryptography and multi-party key generation

export interface DKGParticipant {
  id: string
  index: number // 1-based index for Shamir's Secret Sharing
  publicKeyShare?: any // Party's public key share
  secretKeyShare?: any // Party's secret key share (kept locally)
  commitments?: any[] // Verification commitments
  status: 'registered' | 'key_generated' | 'verified' | 'failed'
}

export interface DKGSession {
  sessionId: string
  threshold: number // Minimum parties needed for decryption
  totalParties: number // Total number of parties
  participants: Map<string, DKGParticipant>
  status: 'initializing' | 'key_generation' | 'verification' | 'completed' | 'failed'
  startTime: number
  completionTime?: number
  masterPublicKey?: any // Combined public key
  parameters: {
    scheme: 'BFV' | 'BGV' | 'CKKS'
    polyModulusDegree: number
    coeffModulus: number[]
    plainModulus?: number
    securityLevel: number
  }
}

export interface SecretShare {
  shareIndex: number // Which share this is (1 to n)
  shareValue: bigint // The actual secret share value
  partyId: string // Who this share belongs to
  threshold: number // Threshold for reconstruction
  sessionId: string
}

export interface KeyShare {
  publicShare: any // Public portion of the key share
  secretShare?: any // Secret portion (only held by owner)
  shareIndex: number
  verificationData: any[] // For verifying share validity
  partyId: string
}

export interface DKGCommitment {
  partyId: string
  commitments: any[] // Polynomial commitments for verification
  sessionId: string
  round: number
}

export interface ThresholdDecryption {
  sessionId: string
  ciphertextId: string
  requiredShares: number
  collectedShares: Map<string, DecryptionShare>
  result?: any // Reconstructed plaintext
  status: 'collecting' | 'reconstructing' | 'completed' | 'failed'
}

export interface DecryptionShare {
  partyId: string
  shareIndex: number
  partialDecryption: any // Partial decryption using party's secret share
  proof?: any // Zero-knowledge proof of correct decryption
  sessionId: string
  ciphertextId: string
}

export interface DKGRound {
  roundNumber: number
  type: 'commitment' | 'share_distribution' | 'verification' | 'complaint'
  participants: string[]
  deadline: number
  messages: Map<string, any>
  status: 'pending' | 'active' | 'completed' | 'failed'
}

export interface KeyRotationSession {
  sessionId: string
  oldSessionId: string // Previous DKG session to rotate from
  participants: string[] // Can be different from old session
  threshold: number
  status: 'initializing' | 'rotating' | 'completed' | 'failed'
  rotationProof?: any // Proof that new keys are properly derived
}

// Error types for DKG operations
export class DKGError extends Error {
  constructor(message: string, public code: string, public sessionId?: string) {
    super(message)
    this.name = 'DKGError'
  }
}

export class ThresholdError extends DKGError {
  constructor(message: string, sessionId?: string) {
    super(message, 'THRESHOLD_ERROR', sessionId)
  }
}

export class VerificationError extends DKGError {
  constructor(message: string, sessionId?: string) {
    super(message, 'VERIFICATION_ERROR', sessionId)
  }
}

export class ShareReconstructionError extends DKGError {
  constructor(message: string, sessionId?: string) {
    super(message, 'SHARE_RECONSTRUCTION_ERROR', sessionId)
  }
}

// Configuration interfaces
export interface DKGConfig {
  defaultThreshold: number
  maxParties: number
  sessionTimeout: number // milliseconds
  roundTimeout: number // milliseconds
  enableProofs: boolean // Whether to use zero-knowledge proofs
  keyRotationInterval: number // milliseconds
  secureStorage: boolean // Whether to use secure storage for shares
}

export interface ShamirConfig {
  prime: bigint // Large prime for field operations
  generator: bigint // Generator for the field
  polynomialDegree: number // degree = threshold - 1
}

// Communication protocol types
export interface DKGMessage {
  type: 'register' | 'commitment' | 'share' | 'verification' | 'complaint' | 'response'
  sessionId: string
  fromParty: string
  toParty?: string // undefined for broadcast messages
  round: number
  payload: any
  timestamp: number
  signature?: string // Message authentication
}

export interface NetworkProtocol {
  broadcast(message: DKGMessage): Promise<void>
  sendTo(partyId: string, message: DKGMessage): Promise<void>
  receiveMessage(): Promise<DKGMessage | null>
  getParticipants(sessionId: string): Promise<string[]>
}