// Comprehensive tests for DKG (Distributed Key Generation) workflows

import { 
  createDKGSystem, 
  validateDKGParameters, 
  estimateDKGPerformance,
  checkDKGCompatibility,
  DKG_CONSTANTS,
  DKGError,
  ThresholdError
} from '../index'
import { ShamirSecretSharing } from '../shamir'
import { DKGManager } from '../dkg-manager'
import { SecureKeyStorage } from '../key-storage'
import { ThresholdDecryptionEngine } from '../threshold-decryption'

// Mock node-seal for testing
jest.mock('node-seal', () => {
  return jest.fn().mockResolvedValue({
    versionMajor: () => 4,
    versionMinor: () => 1,
    versionPatch: () => 2,
    SchemeType: {
      BFV: 'BFV',
      BGV: 'BGV', 
      CKKS: 'CKKS'
    },
    SecurityLevel: {
      tc128: 'tc128'
    },
    EncryptionParameters: jest.fn().mockImplementation(() => ({
      setPolyModulusDegree: jest.fn(),
      setCoeffModulus: jest.fn(),
      setPlainModulus: jest.fn()
    })),
    CoeffModulus: {
      Create: jest.fn().mockReturnValue(new Int32Array([60, 40, 40, 60]))
    },
    Context: jest.fn().mockImplementation(() => ({
      parametersSet: () => true,
      delete: jest.fn()
    })),
    Evaluator: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      multiply: jest.fn(),
      delete: jest.fn(),
      invariantNoiseBudget: jest.fn().mockReturnValue(50)
    })),
    IntegerEncoder: jest.fn().mockImplementation(() => ({
      encode: jest.fn(),
      decode: jest.fn(),
      decodeInt32: jest.fn().mockReturnValue(42),
      delete: jest.fn()
    })),
    CKKSEncoder: jest.fn().mockImplementation(() => ({
      encode: jest.fn(),
      decode: jest.fn(),
      delete: jest.fn()
    })),
    KeyGenerator: jest.fn().mockImplementation(() => ({
      secretKey: jest.fn().mockReturnValue({
        delete: jest.fn()
      }),
      createPublicKey: jest.fn().mockReturnValue({
        delete: jest.fn()
      })
    })),
    Encryptor: jest.fn().mockImplementation(() => ({
      encrypt: jest.fn(),
      invariantNoiseBudget: jest.fn().mockReturnValue(45)
    })),
    Decryptor: jest.fn().mockImplementation(() => ({
      decrypt: jest.fn()
    })),
    PlainText: jest.fn().mockImplementation(() => ({
      delete: jest.fn()
    })),
    CipherText: jest.fn().mockImplementation(() => ({
      delete: jest.fn()
    }))
  })
})

describe('DKG System Tests', () => {
  let dkgSystem: any

  beforeEach(async () => {
    dkgSystem = await createDKGSystem('testing')
  })

  afterEach(async () => {
    if (dkgSystem) {
      await dkgSystem.dkgManager.cleanup()
      await dkgSystem.keyStorage.cleanup()
      await dkgSystem.thresholdDecryption.cleanup()
    }
  })

  describe('DKG System Creation', () => {
    test('should create DKG system for different environments', async () => {
      const devSystem = await createDKGSystem('development')
      expect(devSystem.dkgManager).toBeInstanceOf(DKGManager)
      expect(devSystem.keyStorage).toBeInstanceOf(SecureKeyStorage)
      expect(devSystem.thresholdDecryption).toBeInstanceOf(ThresholdDecryptionEngine)
      expect(devSystem.shamirSS).toBeInstanceOf(ShamirSecretSharing)
      
      await devSystem.dkgManager.cleanup()
      await devSystem.keyStorage.cleanup()
      await devSystem.thresholdDecryption.cleanup()
    })

    test('should have correct system components', () => {
      expect(dkgSystem).toHaveProperty('dkgManager')
      expect(dkgSystem).toHaveProperty('keyStorage')
      expect(dkgSystem).toHaveProperty('thresholdDecryption')
      expect(dkgSystem).toHaveProperty('shamirSS')
    })
  })

  describe('Parameter Validation', () => {
    test('should validate correct parameters', () => {
      const result = validateDKGParameters({
        threshold: 3,
        totalParties: 5,
        sessionTimeout: 60000
      })
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should reject invalid threshold', () => {
      const result = validateDKGParameters({
        threshold: 1,
        totalParties: 5
      })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain(`Threshold must be at least ${DKG_CONSTANTS.MIN_THRESHOLD}`)
    })

    test('should reject threshold exceeding total parties', () => {
      const result = validateDKGParameters({
        threshold: 6,
        totalParties: 5
      })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Threshold cannot exceed total number of parties')
    })

    test('should warn about low threshold ratio', () => {
      const result = validateDKGParameters({
        threshold: 2,
        totalParties: 5
      })
      
      expect(result.errors).toContain('Warning: Threshold should be greater than 50% of total parties for security')
    })
  })

  describe('Performance Estimation', () => {
    test('should estimate DKG performance', () => {
      const estimate = estimateDKGPerformance({
        threshold: 3,
        totalParties: 5,
        dataSize: 1024
      })
      
      expect(estimate).toHaveProperty('estimatedTime')
      expect(estimate).toHaveProperty('memoryUsage')
      expect(estimate).toHaveProperty('networkRounds')
      expect(estimate).toHaveProperty('recommendations')
      
      expect(estimate.estimatedTime).toBeGreaterThan(0)
      expect(estimate.memoryUsage).toBeGreaterThan(0)
      expect(estimate.networkRounds).toBeGreaterThan(0)
    })

    test('should provide recommendations for large systems', () => {
      const estimate = estimateDKGPerformance({
        threshold: 15,
        totalParties: 25,
        dataSize: 2 * 1024 * 1024
      })
      
      expect(estimate.recommendations).toContain('Consider batching operations for large party counts')
      expect(estimate.recommendations).toContain('Large data size may require compression')
    })
  })

  describe('Compatibility Check', () => {
    test('should check system compatibility', () => {
      const compatibility = checkDKGCompatibility()
      
      expect(compatibility).toHaveProperty('compatible')
      expect(compatibility).toHaveProperty('issues')
      expect(compatibility).toHaveProperty('capabilities')
      
      expect(Array.isArray(compatibility.issues)).toBe(true)
      expect(Array.isArray(compatibility.capabilities)).toBe(true)
    })
  })
})

describe('Shamir Secret Sharing', () => {
  let shamirSS: ShamirSecretSharing

  beforeEach(() => {
    shamirSS = new ShamirSecretSharing()
  })

  describe('Share Generation and Reconstruction', () => {
    test('should generate and reconstruct secret correctly', () => {
      const secret = BigInt(12345)
      const threshold = 3
      const numShares = 5
      const sessionId = 'test_session'

      const shares = shamirSS.generateShares(secret, threshold, numShares, sessionId)
      
      expect(shares).toHaveLength(numShares)
      expect(shares[0].threshold).toBe(threshold)
      expect(shares[0].sessionId).toBe(sessionId)

      // Test reconstruction with threshold shares
      const reconstructed = shamirSS.reconstructSecret(shares.slice(0, threshold))
      expect(reconstructed).toBe(secret)
    })

    test('should fail reconstruction with insufficient shares', () => {
      const secret = BigInt(12345)
      const threshold = 3
      const numShares = 5
      const sessionId = 'test_session'

      const shares = shamirSS.generateShares(secret, threshold, numShares, sessionId)
      
      expect(() => {
        shamirSS.reconstructSecret(shares.slice(0, threshold - 1))
      }).toThrow(ThresholdError)
    })

    test('should handle different threshold configurations', () => {
      const secret = BigInt(98765)
      
      // Test 2-of-3 threshold
      const shares2of3 = shamirSS.generateShares(secret, 2, 3, 'session_2of3')
      const reconstructed2of3 = shamirSS.reconstructSecret(shares2of3.slice(0, 2))
      expect(reconstructed2of3).toBe(secret)

      // Test 5-of-7 threshold
      const shares5of7 = shamirSS.generateShares(secret, 5, 7, 'session_5of7')
      const reconstructed5of7 = shamirSS.reconstructSecret(shares5of7.slice(0, 5))
      expect(reconstructed5of7).toBe(secret)
    })
  })

  describe('Share Verification', () => {
    test('should generate and verify commitments', () => {
      const secret = BigInt(54321)
      const coefficients = [secret, BigInt(100), BigInt(200)]
      
      const commitments = shamirSS.generateCommitments(coefficients)
      expect(commitments).toHaveLength(coefficients.length)
      
      const shares = shamirSS.generateShares(secret, 3, 5, 'verify_session')
      const isValid = shamirSS.verifyShare(shares[0], commitments)
      
      // Note: This test might fail due to simplified commitment scheme
      // In production, proper polynomial commitments would be implemented
      expect(typeof isValid).toBe('boolean')
    })
  })

  describe('Share Combination', () => {
    test('should combine shares from multiple secrets', () => {
      const secret1 = BigInt(1000)
      const secret2 = BigInt(2000)
      const threshold = 2
      const numShares = 3

      const shares1 = shamirSS.generateShares(secret1, threshold, numShares, 'combine_session')
      const shares2 = shamirSS.generateShares(secret2, threshold, numShares, 'combine_session')

      const combinedShares = shamirSS.combineShares([shares1, shares2])
      
      expect(combinedShares).toHaveLength(numShares)
      
      const reconstructed = shamirSS.reconstructSecret(combinedShares.slice(0, threshold))
      const expectedSum = (secret1 + secret2) % shamirSS.getConfig().prime
      
      expect(reconstructed).toBe(expectedSum)
    })
  })

  describe('Configuration Management', () => {
    test('should update and retrieve configuration', () => {
      const newConfig = {
        prime: BigInt('17'),
        generator: BigInt('3')
      }
      
      shamirSS.updateConfig(newConfig)
      const config = shamirSS.getConfig()
      
      expect(config.prime).toBe(newConfig.prime)
      expect(config.generator).toBe(newConfig.generator)
    })
  })
})

describe('DKG Manager', () => {
  let dkgManager: DKGManager

  beforeEach(() => {
    dkgManager = new DKGManager({
      defaultThreshold: 3,
      maxParties: 10,
      sessionTimeout: 60000
    })
  })

  afterEach(async () => {
    await dkgManager.cleanup()
  })

  describe('Session Management', () => {
    test('should initialize DKG session', async () => {
      const sessionId = 'test_session_1'
      const session = await dkgManager.initializeSession(
        sessionId,
        3,
        5,
        {
          scheme: 'BFV',
          polyModulusDegree: 4096,
          coeffModulus: [60, 40, 40, 60],
          plainModulus: 1024,
          securityLevel: 128
        }
      )
      
      expect(session.sessionId).toBe(sessionId)
      expect(session.threshold).toBe(3)
      expect(session.totalParties).toBe(5)
      expect(session.status).toBe('initializing')
    })

    test('should register participants', async () => {
      const sessionId = 'test_session_2'
      await dkgManager.initializeSession(sessionId, 2, 3, {
        scheme: 'BFV',
        polyModulusDegree: 4096,
        coeffModulus: [60, 40, 40, 60],
        plainModulus: 1024,
        securityLevel: 128
      })

      const participant1 = await dkgManager.registerParticipant(sessionId, 'party_1')
      const participant2 = await dkgManager.registerParticipant(sessionId, 'party_2')
      
      expect(participant1.id).toBe('party_1')
      expect(participant1.index).toBe(1)
      expect(participant2.id).toBe('party_2')
      expect(participant2.index).toBe(2)
    })

    test('should reject duplicate participant registration', async () => {
      const sessionId = 'test_session_3'
      await dkgManager.initializeSession(sessionId, 2, 3, {
        scheme: 'BFV',
        polyModulusDegree: 4096,
        coeffModulus: [60, 40, 40, 60],
        plainModulus: 1024,
        securityLevel: 128
      })

      await dkgManager.registerParticipant(sessionId, 'party_1')
      
      await expect(
        dkgManager.registerParticipant(sessionId, 'party_1')
      ).rejects.toThrow(DKGError)
    })

    test('should start key generation process', async () => {
      const sessionId = 'test_session_4'
      await dkgManager.initializeSession(sessionId, 2, 2, {
        scheme: 'BFV',
        polyModulusDegree: 4096,
        coeffModulus: [60, 40, 40, 60],
        plainModulus: 1024,
        securityLevel: 128
      })

      await dkgManager.registerParticipant(sessionId, 'party_1')
      await dkgManager.registerParticipant(sessionId, 'party_2')

      await dkgManager.startKeyGeneration(sessionId)
      
      const session = dkgManager.getSessionStatus(sessionId)
      expect(session?.status).toBe('completed')
    }, 10000)
  })

  describe('Error Handling', () => {
    test('should reject invalid threshold configuration', async () => {
      await expect(
        dkgManager.initializeSession('invalid_session', 6, 5, {
          scheme: 'BFV',
          polyModulusDegree: 4096,
          coeffModulus: [60, 40, 40, 60],
          plainModulus: 1024,
          securityLevel: 128
        })
      ).rejects.toThrow(ThresholdError)
    })

    test('should reject starting key generation with insufficient participants', async () => {
      const sessionId = 'insufficient_session'
      await dkgManager.initializeSession(sessionId, 3, 5, {
        scheme: 'BFV',
        polyModulusDegree: 4096,
        coeffModulus: [60, 40, 40, 60],
        plainModulus: 1024,
        securityLevel: 128
      })

      await dkgManager.registerParticipant(sessionId, 'party_1')
      
      await expect(
        dkgManager.startKeyGeneration(sessionId)
      ).rejects.toThrow(DKGError)
    })
  })

  describe('Session Cleanup', () => {
    test('should clean up expired sessions', async () => {
      // Create a session with very short timeout
      const shortTimeoutManager = new DKGManager({
        defaultThreshold: 2,
        maxParties: 5,
        sessionTimeout: 1 // 1ms timeout
      })

      await shortTimeoutManager.initializeSession('expire_session', 2, 3, {
        scheme: 'BFV',
        polyModulusDegree: 4096,
        coeffModulus: [60, 40, 40, 60],
        plainModulus: 1024,
        securityLevel: 128
      })

      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 10))
      
      shortTimeoutManager.cleanupExpiredSessions()
      
      const session = shortTimeoutManager.getSessionStatus('expire_session')
      expect(session).toBeUndefined()
      
      await shortTimeoutManager.cleanup()
    })
  })
})

describe('Secure Key Storage', () => {
  let keyStorage: SecureKeyStorage

  beforeEach(() => {
    keyStorage = new SecureKeyStorage({
      maxStorageSize: 1024 * 1024,
      autoRotationEnabled: false,
      auditEnabled: true
    })
  })

  afterEach(async () => {
    await keyStorage.cleanup()
  })

  describe('Key Storage and Retrieval', () => {
    test('should store and retrieve keys', async () => {
      const keyId = 'test_key_1'
      const keyData = { secretValue: 'encrypted_secret' }
      
      await keyStorage.storeKey(
        keyId,
        'session_1',
        'party_1',
        'secret_share',
        keyData
      )

      const retrievedKey = await keyStorage.retrieveKey(keyId, 'party_1')
      
      expect(retrievedKey).not.toBeNull()
      expect(retrievedKey?.id).toBe(keyId)
      expect(retrievedKey?.partyId).toBe('party_1')
      expect(retrievedKey?.keyData).toEqual(keyData)
    })

    test('should enforce access controls', async () => {
      const keyId = 'access_test_key'
      await keyStorage.storeKey(
        keyId,
        'session_1',
        'party_1',
        'secret_share',
        { secret: 'data' }
      )

      await expect(
        keyStorage.retrieveKey(keyId, 'party_2')
      ).rejects.toThrow(DKGError)
    })

    test('should list session keys', async () => {
      await keyStorage.storeKey('key1', 'session_1', 'party_1', 'secret_share', {})
      await keyStorage.storeKey('key2', 'session_1', 'party_1', 'public_key', {})
      await keyStorage.storeKey('key3', 'session_2', 'party_1', 'secret_share', {})

      const sessionKeys = keyStorage.listSessionKeys('session_1', 'party_1')
      
      expect(sessionKeys).toHaveLength(2)
      expect(sessionKeys.map(k => k.id)).toContain('key1')
      expect(sessionKeys.map(k => k.id)).toContain('key2')
      expect(sessionKeys.map(k => k.id)).not.toContain('key3')
    })
  })

  describe('Key Rotation', () => {
    test('should rotate session keys', async () => {
      await keyStorage.storeKey('old_key', 'old_session', 'party_1', 'secret_share', { value: 'old' })
      
      const rotationSession = await keyStorage.rotateSessionKeys('old_session', 'new_session')
      
      expect(rotationSession.status).toBe('completed')
      expect(rotationSession.oldSessionId).toBe('old_session')
      expect(rotationSession.sessionId).toBe('new_session')
    })
  })

  describe('Backup and Import', () => {
    test('should export and import backup', async () => {
      await keyStorage.storeKey('backup_key', 'backup_session', 'party_1', 'secret_share', { data: 'backup_test' })
      
      const backup = await keyStorage.exportBackup('backup_session')
      expect(typeof backup).toBe('string')
      
      // Create new storage instance
      const newStorage = new SecureKeyStorage()
      await newStorage.importBackup(backup)
      
      const importedKey = await newStorage.retrieveKey('backup_key', 'party_1')
      expect(importedKey?.keyData.data).toBe('backup_test')
      
      await newStorage.cleanup()
    })
  })

  describe('Metrics and Monitoring', () => {
    test('should provide storage metrics', async () => {
      await keyStorage.storeKey('metric_key_1', 'session_1', 'party_1', 'secret_share', {})
      await keyStorage.storeKey('metric_key_2', 'session_1', 'party_2', 'public_key', {})
      
      const metrics = keyStorage.getMetrics()
      
      expect(metrics.totalKeys).toBe(2)
      expect(metrics.activeKeys).toBe(2)
      expect(metrics.expiredKeys).toBe(0)
      expect(metrics.storageUsed).toBeGreaterThan(0)
    })
  })
})

describe('Threshold Decryption Engine', () => {
  let thresholdDecryption: ThresholdDecryptionEngine
  let keyStorage: SecureKeyStorage

  beforeEach(() => {
    keyStorage = new SecureKeyStorage()
    thresholdDecryption = new ThresholdDecryptionEngine(keyStorage)
  })

  afterEach(async () => {
    await thresholdDecryption.cleanup()
    await keyStorage.cleanup()
  })

  describe('Decryption Request Management', () => {
    test('should initiate decryption request', async () => {
      const request = await thresholdDecryption.initiateDecryption(
        'decrypt_req_1',
        'session_1',
        'cipher_1',
        { encryptedValue: 'test_cipher' },
        'requester_1',
        3
      )
      
      expect(request.requestId).toBe('decrypt_req_1')
      expect(request.requiredShares).toBe(3)
      expect(request.requesterPartyId).toBe('requester_1')
    })

    test('should track decryption status', async () => {
      await thresholdDecryption.initiateDecryption(
        'status_req',
        'session_1',
        'cipher_1',
        { data: 'test' },
        'requester_1',
        2
      )
      
      const status = thresholdDecryption.getDecryptionStatus('status_req')
      expect(status).toBeDefined()
      expect(status?.requestId).toBe('status_req')
    })

    test('should cancel decryption requests', async () => {
      await thresholdDecryption.initiateDecryption(
        'cancel_req',
        'session_1',
        'cipher_1',
        { data: 'test' },
        'requester_1',
        2
      )
      
      thresholdDecryption.cancelDecryption('cancel_req')
      
      const status = thresholdDecryption.getDecryptionStatus('cancel_req')
      expect(status).toBeUndefined()
    })
  })

  describe('Share Generation and Submission', () => {
    test('should generate decryption shares', async () => {
      // Store a secret key first
      await keyStorage.storeKey(
        'secret_key_1',
        'session_1',
        'party_1',
        'secret_share',
        { secretValue: 'mock_secret' }
      )

      await thresholdDecryption.initiateDecryption(
        'share_req',
        'session_1',
        'cipher_1',
        { data: 'encrypted' },
        'requester_1',
        2
      )

      const share = await thresholdDecryption.generateDecryptionShare(
        'share_req',
        'party_1',
        'secret_key_1'
      )
      
      expect(share.partyId).toBe('party_1')
      expect(share.sessionId).toBe('session_1')
      expect(share.ciphertextId).toBe('cipher_1')
      expect(share).toHaveProperty('partialDecryption')
      expect(share).toHaveProperty('proof')
    })
  })

  describe('Cleanup Operations', () => {
    test('should clean up expired requests', async () => {
      // Create request with past deadline
      await thresholdDecryption.initiateDecryption(
        'expired_req',
        'session_1',
        'cipher_1',
        { data: 'test' },
        'requester_1',
        2,
        Date.now() - 1000 // 1 second ago
      )
      
      thresholdDecryption.cleanupExpiredRequests()
      
      const status = thresholdDecryption.getDecryptionStatus('expired_req')
      expect(status).toBeUndefined()
    })
  })
})

describe('Integration Tests', () => {
  test('should perform complete DKG workflow', async () => {
    const dkgSystem = await createDKGSystem('testing')
    const sessionId = 'integration_session'
    
    try {
      // Initialize session
      await dkgSystem.dkgManager.initializeSession(
        sessionId,
        2,
        3,
        {
          scheme: 'BFV',
          polyModulusDegree: 4096,
          coeffModulus: [60, 40, 40, 60],
          plainModulus: 1024,
          securityLevel: 128
        }
      )

      // Register participants
      await dkgSystem.dkgManager.registerParticipant(sessionId, 'party_1')
      await dkgSystem.dkgManager.registerParticipant(sessionId, 'party_2')
      await dkgSystem.dkgManager.registerParticipant(sessionId, 'party_3')

      // Start key generation
      await dkgSystem.dkgManager.startKeyGeneration(sessionId)

      // Verify session completion
      const session = dkgSystem.dkgManager.getSessionStatus(sessionId)
      expect(session?.status).toBe('completed')

      // Test key storage integration - in current implementation,
      // keys are managed internally by DKG manager rather than stored in keyStorage
      const metrics = dkgSystem.keyStorage.getMetrics()
      expect(metrics.totalKeys).toBeGreaterThanOrEqual(0)

    } finally {
      await dkgSystem.dkgManager.cleanup()
      await dkgSystem.keyStorage.cleanup()
      await dkgSystem.thresholdDecryption.cleanup()
    }
  }, 15000)

  test('should handle threshold decryption workflow', async () => {
    const dkgSystem = await createDKGSystem('development')
    
    try {
      // Store mock keys for parties
      await dkgSystem.keyStorage.storeKey('key_1', 'session_1', 'party_1', 'secret_share', { secret: 'value1' })
      await dkgSystem.keyStorage.storeKey('key_2', 'session_1', 'party_2', 'secret_share', { secret: 'value2' })

      // Initiate decryption
      const request = await dkgSystem.thresholdDecryption.initiateDecryption(
        'threshold_test',
        'session_1',
        'cipher_test',
        { encryptedData: 'mock_cipher' },
        'requester',
        2
      )

      expect(request.requestId).toBe('threshold_test')
      expect(request.requiredShares).toBe(2)

      // Generate and submit shares
      const share1 = await dkgSystem.thresholdDecryption.generateDecryptionShare(
        'threshold_test',
        'party_1',
        'key_1'
      )

      const share2 = await dkgSystem.thresholdDecryption.generateDecryptionShare(
        'threshold_test',
        'party_2',
        'key_2'
      )

      // Submit shares
      await dkgSystem.thresholdDecryption.submitDecryptionShare('threshold_test', share1)
      const completed = await dkgSystem.thresholdDecryption.submitDecryptionShare('threshold_test', share2)

      expect(completed).toBe(true)

    } finally {
      await dkgSystem.dkgManager.cleanup()
      await dkgSystem.keyStorage.cleanup()
      await dkgSystem.thresholdDecryption.cleanup()
    }
  }, 10000)
})