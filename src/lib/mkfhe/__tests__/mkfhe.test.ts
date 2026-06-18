// MKFHE Engine Tests

import { createSMPCProcessor, checkEnvironmentSupport, MKFHEEngine, PARAMETER_SETS } from '../index'

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
    CoeffModulus: {
      Create: jest.fn().mockReturnValue([])
    },
    EncryptionParameters: jest.fn().mockImplementation(() => ({
      setPolyModulusDegree: jest.fn(),
      setCoeffModulus: jest.fn(),
      setPlainModulus: jest.fn()
    })),
    Context: jest.fn().mockImplementation(() => ({
      parametersSet: () => true,
      delete: jest.fn()
    })),
    Evaluator: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      multiply: jest.fn(),
      invariantNoiseBudget: jest.fn().mockReturnValue(50),
      delete: jest.fn()
    })),
    IntegerEncoder: jest.fn().mockImplementation(() => ({
      encode: jest.fn(),
      decodeInt32: jest.fn().mockReturnValue(42),
      decode: jest.fn(),
      delete: jest.fn()
    })),
    CKKSEncoder: jest.fn().mockImplementation(() => ({
      encode: jest.fn(),
      decode: jest.fn(),
      delete: jest.fn()
    })),
    KeyGenerator: jest.fn().mockImplementation(() => ({
      secretKey: jest.fn().mockReturnValue({ delete: jest.fn() }),
      createPublicKey: jest.fn().mockReturnValue({ delete: jest.fn() })
    })),
    Encryptor: jest.fn().mockImplementation(() => ({
      encrypt: jest.fn(),
      invariantNoiseBudget: jest.fn().mockReturnValue(50)
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

describe('MKFHE Environment Support', () => {
  test('should check environment support', () => {
    const support = checkEnvironmentSupport()
    expect(support).toHaveProperty('supported')
    expect(support).toHaveProperty('issues')
    expect(support).toHaveProperty('recommendations')
    expect(Array.isArray(support.issues)).toBe(true)
    expect(Array.isArray(support.recommendations)).toBe(true)
  })
})

describe('MKFHE Engine', () => {
  let engine: MKFHEEngine

  beforeEach(() => {
    engine = new MKFHEEngine()
  })

  afterEach(async () => {
    await engine.cleanup()
  })

  test('should create context with valid parameters', async () => {
    const parameters = PARAMETER_SETS.development
    const context = await engine.createContext('test', parameters)
    
    expect(context).toBeDefined()
    expect(context.parameters).toEqual(parameters)
  })

  test('should generate key pairs for parties', async () => {
    const parameters = PARAMETER_SETS.development
    await engine.createContext('test', parameters)
    
    const keyPair = await engine.generateKeyPair('party1', 'test')
    expect(keyPair).toBeDefined()
    expect(keyPair.partyId).toBe('party1')
    expect(keyPair.publicKey).toBeDefined()
    expect(keyPair.secretKey).toBeDefined()
  })

  test('should aggregate public keys', async () => {
    const parameters = PARAMETER_SETS.development
    await engine.createContext('test', parameters)
    
    await engine.generateKeyPair('party1', 'test')
    await engine.generateKeyPair('party2', 'test')
    
    const aggregatedKey = await engine.aggregatePublicKeys(['party1', 'party2'], 'test')
    expect(aggregatedKey).toBeDefined()
    expect(aggregatedKey.participatingParties).toEqual(['party1', 'party2'])
  })

  test('should track performance metrics', () => {
    const metrics = engine.getPerformanceMetrics()
    expect(Array.isArray(metrics)).toBe(true)
    
    engine.clearPerformanceMetrics()
    const clearedMetrics = engine.getPerformanceMetrics()
    expect(clearedMetrics.length).toBe(0)
  })
})

describe('SMPC Processor', () => {
  test('should create and initialize SMPC processor', async () => {
    const processor = await createSMPCProcessor(128, 'development')
    expect(processor).toBeDefined()
    
    await processor.cleanup()
  })

  test('should register parties', async () => {
    const processor = await createSMPCProcessor(128, 'development')
    
    await expect(processor.registerParty('party1')).resolves.not.toThrow()
    await expect(processor.registerParty('party2')).resolves.not.toThrow()
    
    await processor.cleanup()
  })

  test('should simulate multi-party workflow', async () => {
    const processor = await createSMPCProcessor(128, 'development')
    
    const parties = ['party1', 'party2', 'party3']
    const dataPoints = [[10], [20], [30]]
    
    const result = await processor.simulateMultiPartyWorkflow(parties, dataPoints, 'sum')
    
    expect(result).toBeDefined()
    expect(result.computation).toBeDefined()
    expect(result.decryptedResult).toBeDefined()
    expect(result.computation.operation).toBe('sum')
    expect(result.computation.participatingParties).toEqual(expect.arrayContaining(parties))
    
    await processor.cleanup()
  })

  test('should maintain computation history', async () => {
    const processor = await createSMPCProcessor(128, 'development')
    
    await processor.registerParty('party1')
    await processor.registerParty('party2')
    
    const encrypted1 = await processor.encryptData([10], 'party1')
    const encrypted2 = await processor.encryptData([20], 'party2')
    
    await processor.performCustomComputation([encrypted1, encrypted2], 'add')
    
    const history = processor.getComputationHistory()
    expect(history.length).toBeGreaterThan(0)
    expect(history[0].operation).toBe('add')
    
    processor.clearHistory()
    const clearedHistory = processor.getComputationHistory()
    expect(clearedHistory.length).toBe(0)
    
    await processor.cleanup()
  })
})

describe('Parameter Management', () => {
  test('should validate parameters correctly', async () => {
    const engine = new MKFHEEngine()
    
    // Valid parameters should work
    const validParams = PARAMETER_SETS.development
    await expect(engine.createContext('test', validParams)).resolves.toBeDefined()
    
    // Invalid parameters should throw
    const invalidParams = {
      ...validParams,
      polyModulusDegree: 1000 as any // Invalid degree
    }
    
    await expect(engine.createContext('test2', invalidParams)).rejects.toThrow()
    
    await engine.cleanup()
  })

  test('should provide parameter sets for different use cases', () => {
    const paramSets = MKFHEEngine.getParameterSets()
    
    expect(paramSets).toHaveProperty('development')
    expect(paramSets).toHaveProperty('production_standard')
    expect(paramSets).toHaveProperty('high_security')
    expect(paramSets).toHaveProperty('ckks_standard')
    expect(paramSets).toHaveProperty('bgv_batched')
    
    // Verify development parameters
    expect(paramSets.development.scheme).toBe('BFV')
    expect(paramSets.development.securityLevel).toBe(128)
    expect(paramSets.development.polyModulusDegree).toBe(4096)
  })
})

describe('Error Handling', () => {
  test('should handle invalid party operations', async () => {
    const processor = await createSMPCProcessor(128, 'development')
    
    // Try to encrypt data for non-registered party
    await expect(processor.encryptData([10], 'nonexistent')).rejects.toThrow()
    
    await processor.cleanup()
  })

  test('should handle invalid computation operations', async () => {
    const processor = await createSMPCProcessor(128, 'development')
    
    await processor.registerParty('party1')
    const encrypted = await processor.encryptData([10], 'party1')
    
    // Try operation with insufficient inputs
    await expect(processor.performCustomComputation([encrypted], 'add')).rejects.toThrow()
    
    await processor.cleanup()
  })
})