import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { 
  AlgorithmExecutor,
  ComputationRequest,
  ExecutionResult,
  ComputationType
} from '../../../src/lib/execution/algorithm-executor'

// Mock dependencies
const mockComputationRouter = {
  routeComputation: jest.fn(),
  updateNodeLoad: jest.fn(),
}

const mockAlgorithmDatabase = {
  getAlgorithm: jest.fn(),
  getAlgorithmVersion: jest.fn(),
}

const mockEncryptionService = {
  decryptAlgorithmCode: jest.fn(),
}

const mockSMPCProcessor = {
  executeSecureComputation: jest.fn(),
}

const mockRedisClient = {
  hmset: jest.fn(),
  hgetall: jest.fn(),
  hset: jest.fn(),
  keys: jest.fn(),
  del: jest.fn(),
}

jest.mock('../../../src/lib/execution/computation-router', () => ({
  computationRouter: mockComputationRouter
}))

jest.mock('../../../src/lib/database/algorithm-schemas', () => ({
  algorithmDatabase: mockAlgorithmDatabase
}))

jest.mock('../../../src/lib/crypto/algorithm-encryption', () => ({
  algorithmEncryption: mockEncryptionService
}))

jest.mock('../../../src/lib/mkfhe/smpc-processor', () => ({
  SMPCProcessor: jest.fn().mockImplementation(() => mockSMPCProcessor)
}))

jest.mock('../../../src/lib/database/redis-client', () => mockRedisClient)

describe('AlgorithmExecutor', () => {
  let algorithmExecutor: AlgorithmExecutor

  beforeEach(() => {
    algorithmExecutor = new AlgorithmExecutor()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('executeAlgorithm', () => {
    const mockRequest: ComputationRequest = {
      id: 'test-computation-id',
      algorithmId: 'test-algorithm-id',
      computationType: 'third_party',
      inputDataIds: ['data1', 'data2'],
      requesterAddress: '0x123456789',
      parameters: { param1: 'value1' },
      privacyLevel: 'medium'
    }

    const mockAlgorithm = {
      id: 'test-algorithm-id',
      name: 'Test Algorithm',
      description: 'A test algorithm',
      computationType: 'third_party' as ComputationType,
      code: 'function compute(data) { return data.map(d => d * 2); }',
      status: 'approved' as const,
      authorAddress: '0xauthor123',
      isPublic: true,
      inputSchema: { type: 'array' },
      outputSchema: { type: 'array' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const mockRoutingDecision = {
      selectedNode: {
        id: 'node1',
        type: 'third_party' as const,
        status: 'online' as const,
        capacity: 100,
        currentLoad: 25,
        capabilities: ['javascript'],
        lastHeartbeat: Date.now(),
        location: 'us-east-1',
        trustScore: 95
      },
      routingReason: 'Selected for optimal performance',
      estimatedTime: 5000,
      estimatedCost: 0.10,
      fallbackNodes: []
    }

    it('should execute third-party algorithm successfully', async () => {
      mockAlgorithmDatabase.getAlgorithm.mockResolvedValue(mockAlgorithm)
      mockComputationRouter.routeComputation.mockResolvedValue(mockRoutingDecision)
      mockEncryptionService.decryptAlgorithmCode.mockResolvedValue('function compute(data) { return data.map(d => d * 2); }')
      mockRedisClient.hmset.mockResolvedValue('OK')

      const result = await algorithmExecutor.executeAlgorithm(mockRequest)

      expect(result).toBeDefined()
      expect(result.computationId).toBe(mockRequest.id)
      expect(result.status).toBe('completed')
      expect(result.result).toBeDefined()
      expect(mockAlgorithmDatabase.getAlgorithm).toHaveBeenCalledWith(mockRequest.algorithmId)
      expect(mockComputationRouter.routeComputation).toHaveBeenCalledWith(mockRequest)
    })

    it('should handle algorithm not found error', async () => {
      mockAlgorithmDatabase.getAlgorithm.mockResolvedValue(null)

      await expect(algorithmExecutor.executeAlgorithm(mockRequest)).rejects.toThrow(
        'Algorithm not found'
      )
    })

    it('should handle non-approved algorithm', async () => {
      const pendingAlgorithm = { ...mockAlgorithm, status: 'pending' as const }
      mockAlgorithmDatabase.getAlgorithm.mockResolvedValue(pendingAlgorithm)

      await expect(algorithmExecutor.executeAlgorithm(mockRequest)).rejects.toThrow(
        'Algorithm not approved for execution'
      )
    })

    it('should handle ZK computation', async () => {
      const zkRequest = { ...mockRequest, computationType: 'zk' as ComputationType }
      const zkAlgorithm = { ...mockAlgorithm, computationType: 'zk' as ComputationType }
      const zkRoutingDecision = {
        ...mockRoutingDecision,
        selectedNode: { ...mockRoutingDecision.selectedNode, type: 'zk' as const }
      }

      mockAlgorithmDatabase.getAlgorithm.mockResolvedValue(zkAlgorithm)
      mockComputationRouter.routeComputation.mockResolvedValue(zkRoutingDecision)
      mockEncryptionService.decryptAlgorithmCode.mockResolvedValue('zk circuit code')
      mockRedisClient.hmset.mockResolvedValue('OK')

      const result = await algorithmExecutor.executeAlgorithm(zkRequest)

      expect(result).toBeDefined()
      expect(result.computationType).toBe('zk')
      expect(result.proof).toBeDefined()
    })

    it('should handle FHE computation', async () => {
      const fheRequest = { ...mockRequest, computationType: 'fhe' as ComputationType }
      const fheAlgorithm = { ...mockAlgorithm, computationType: 'fhe' as ComputationType }
      const fheRoutingDecision = {
        ...mockRoutingDecision,
        selectedNode: { ...mockRoutingDecision.selectedNode, type: 'fhe' as const }
      }

      mockAlgorithmDatabase.getAlgorithm.mockResolvedValue(fheAlgorithm)
      mockComputationRouter.routeComputation.mockResolvedValue(fheRoutingDecision)
      mockEncryptionService.decryptAlgorithmCode.mockResolvedValue('fhe computation code')
      mockSMPCProcessor.executeSecureComputation.mockResolvedValue({
        result: 'encrypted_result',
        proof: 'fhe_proof'
      })
      mockRedisClient.hmset.mockResolvedValue('OK')

      const result = await algorithmExecutor.executeAlgorithm(fheRequest)

      expect(result).toBeDefined()
      expect(result.computationType).toBe('fhe')
      expect(result.encrypted).toBe(true)
      expect(mockSMPCProcessor.executeSecureComputation).toHaveBeenCalled()
    })

    it('should handle execution errors gracefully', async () => {
      const maliciousAlgorithm = {
        ...mockAlgorithm,
        code: 'function compute() { throw new Error("Malicious code"); }'
      }

      mockAlgorithmDatabase.getAlgorithm.mockResolvedValue(maliciousAlgorithm)
      mockComputationRouter.routeComputation.mockResolvedValue(mockRoutingDecision)
      mockEncryptionService.decryptAlgorithmCode.mockResolvedValue(maliciousAlgorithm.code)
      mockRedisClient.hmset.mockResolvedValue('OK')

      const result = await algorithmExecutor.executeAlgorithm(mockRequest)

      expect(result.status).toBe('failed')
      expect(result.error).toContain('Malicious code')
    })
  })

  describe('validateInputData', () => {
    it('should validate input data against schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'age']
      }

      const validData = { name: 'John', age: 30 }
      const invalidData = { name: 'John' } // missing age

      expect(algorithmExecutor.validateInputData(validData, schema)).toBe(true)
      expect(algorithmExecutor.validateInputData(invalidData, schema)).toBe(false)
    })

    it('should handle array schemas', () => {
      const schema = {
        type: 'array',
        items: { type: 'number' }
      }

      const validData = [1, 2, 3, 4, 5]
      const invalidData = [1, 'two', 3]

      expect(algorithmExecutor.validateInputData(validData, schema)).toBe(true)
      expect(algorithmExecutor.validateInputData(invalidData, schema)).toBe(false)
    })
  })

  describe('listActiveComputations', () => {
    it('should return list of active computations', async () => {
      const mockComputationIds = ['comp1', 'comp2', 'comp3']
      const mockComputationData = {
        id: 'comp1',
        status: 'running',
        algorithmId: 'algo1',
        requesterAddress: '0x123',
        createdAt: new Date().toISOString()
      }

      mockRedisClient.keys.mockResolvedValue(mockComputationIds.map(id => `computation:${id}`))
      mockRedisClient.hgetall.mockResolvedValue(mockComputationData)

      const result = await algorithmExecutor.listActiveComputations()

      expect(Array.isArray(result)).toBe(true)
      expect(mockRedisClient.keys).toHaveBeenCalledWith('computation:*')
    })
  })

  describe('getComputationResult', () => {
    it('should retrieve computation result', async () => {
      const computationId = 'test-computation-id'
      const mockResult = {
        id: computationId,
        status: 'completed',
        result: { data: 'test result' },
        algorithmId: 'algo1',
        computationType: 'third_party',
        executionTime: 5000,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      }

      mockRedisClient.hgetall.mockResolvedValue(mockResult)

      const result = await algorithmExecutor.getComputationResult(computationId)

      expect(result).toBeDefined()
      expect(result?.id).toBe(computationId)
      expect(result?.status).toBe('completed')
    })

    it('should return null for non-existent computation', async () => {
      mockRedisClient.hgetall.mockResolvedValue({})

      const result = await algorithmExecutor.getComputationResult('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('cancelComputation', () => {
    it('should cancel running computation', async () => {
      const computationId = 'test-computation-id'
      const mockComputation = {
        id: computationId,
        status: 'running',
        requesterAddress: '0x123456789'
      }

      mockRedisClient.hgetall.mockResolvedValue(mockComputation)
      mockRedisClient.hset.mockResolvedValue(1)

      const result = await algorithmExecutor.cancelComputation(computationId, '0x123456789')

      expect(result).toBe(true)
      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        `computation:${computationId}`,
        'status',
        'cancelled'
      )
    })

    it('should fail to cancel computation by unauthorized user', async () => {
      const computationId = 'test-computation-id'
      const mockComputation = {
        id: computationId,
        status: 'running',
        requesterAddress: '0x123456789'
      }

      mockRedisClient.hgetall.mockResolvedValue(mockComputation)

      await expect(
        algorithmExecutor.cancelComputation(computationId, '0xunauthorized')
      ).rejects.toThrow('Unauthorized')
    })
  })
})