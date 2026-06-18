import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { 
  AlgorithmDatabase,
  Algorithm,
  AlgorithmStatus,
  ComputationType
} from '../../../src/lib/database/algorithm-schemas'

// Mock Redis client
const mockRedisClient = {
  hmset: jest.fn(),
  hgetall: jest.fn(),
  hset: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  lrange: jest.fn(),
  lpush: jest.fn(),
  lrem: jest.fn(),
  sadd: jest.fn(),
  smembers: jest.fn(),
  srem: jest.fn(),
  exists: jest.fn(),
  incr: jest.fn(),
}

jest.mock('../../../src/lib/database/redis-client', () => mockRedisClient)

describe('AlgorithmDatabase', () => {
  let algorithmDb: AlgorithmDatabase
  
  beforeEach(() => {
    algorithmDb = new AlgorithmDatabase()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('createAlgorithm', () => {
    it('should create a new algorithm successfully', async () => {
      const algorithmData = {
        name: 'Test Algorithm',
        description: 'A test algorithm',
        computationType: 'third_party' as ComputationType,
        code: 'function test() { return "hello"; }',
        authorAddress: '0x123456789',
        isPublic: true,
        inputSchema: { type: 'object', properties: {} },
        outputSchema: { type: 'object', properties: {} }
      }

      mockRedisClient.exists.mockResolvedValue(0)
      mockRedisClient.hmset.mockResolvedValue('OK')
      mockRedisClient.sadd.mockResolvedValue(1)

      const result = await algorithmDb.createAlgorithm(algorithmData)

      expect(result.name).toBe(algorithmData.name)
      expect(result.status).toBe('pending')
      expect(result.computationType).toBe(algorithmData.computationType)
      expect(mockRedisClient.hmset).toHaveBeenCalled()
      expect(mockRedisClient.sadd).toHaveBeenCalled()
    })

    it('should throw error for duplicate algorithm names by same author', async () => {
      const algorithmData = {
        name: 'Duplicate Algorithm',
        description: 'A test algorithm',
        computationType: 'third_party' as ComputationType,
        code: 'function test() { return "hello"; }',
        authorAddress: '0x123456789',
        isPublic: true,
        inputSchema: { type: 'object', properties: {} },
        outputSchema: { type: 'object', properties: {} }
      }

      mockRedisClient.exists.mockResolvedValue(1)

      await expect(algorithmDb.createAlgorithm(algorithmData)).rejects.toThrow(
        'Algorithm with this name already exists'
      )
    })
  })

  describe('getAlgorithm', () => {
    it('should retrieve algorithm by ID', async () => {
      const algorithmId = 'test-algorithm-id'
      const mockAlgorithmData = {
        id: algorithmId,
        name: 'Test Algorithm',
        description: 'A test algorithm',
        computationType: 'third_party',
        status: 'approved',
        authorAddress: '0x123456789',
        isPublic: 'true',
        inputSchema: '{"type":"object"}',
        outputSchema: '{"type":"object"}',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      mockRedisClient.hgetall.mockResolvedValue(mockAlgorithmData)

      const result = await algorithmDb.getAlgorithm(algorithmId)

      expect(result).toBeDefined()
      expect(result?.id).toBe(algorithmId)
      expect(result?.name).toBe('Test Algorithm')
      expect(result?.isPublic).toBe(true)
    })

    it('should return null for non-existent algorithm', async () => {
      mockRedisClient.hgetall.mockResolvedValue({})

      const result = await algorithmDb.getAlgorithm('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('updateAlgorithmStatus', () => {
    it('should update algorithm status successfully', async () => {
      const algorithmId = 'test-algorithm-id'
      const newStatus: AlgorithmStatus = 'approved'
      const reason = 'Algorithm meets all requirements'

      mockRedisClient.hset.mockResolvedValue(1)

      const result = await algorithmDb.updateAlgorithmStatus(algorithmId, newStatus, reason)

      expect(result).toBe(true)
      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        `algorithm:${algorithmId}`,
        'status',
        newStatus
      )
      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        `algorithm:${algorithmId}`,
        'statusReason',
        reason
      )
    })
  })

  describe('listAlgorithms', () => {
    it('should list algorithms with filters', async () => {
      const mockAlgorithmIds = ['algo1', 'algo2', 'algo3']
      const mockAlgorithmData = {
        id: 'algo1',
        name: 'Algorithm 1',
        status: 'approved',
        computationType: 'third_party',
        isPublic: 'true',
        authorAddress: '0x123456789',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      mockRedisClient.keys.mockResolvedValue(mockAlgorithmIds.map(id => `algorithm:${id}`))
      mockRedisClient.hgetall.mockResolvedValue(mockAlgorithmData)

      const result = await algorithmDb.listAlgorithms({
        status: 'approved',
        computationType: 'third_party',
        limit: 10
      })

      expect(Array.isArray(result)).toBe(true)
      expect(mockRedisClient.keys).toHaveBeenCalledWith('algorithm:*')
    })
  })

  describe('deleteAlgorithm', () => {
    it('should delete algorithm and associated data', async () => {
      const algorithmId = 'test-algorithm-id'
      const mockAlgorithmData = {
        id: algorithmId,
        authorAddress: '0x123456789',
        name: 'Test Algorithm'
      }

      mockRedisClient.hgetall.mockResolvedValue(mockAlgorithmData)
      mockRedisClient.del.mockResolvedValue(1)
      mockRedisClient.srem.mockResolvedValue(1)

      const result = await algorithmDb.deleteAlgorithm(algorithmId)

      expect(result).toBe(true)
      expect(mockRedisClient.del).toHaveBeenCalledWith(`algorithm:${algorithmId}`)
      expect(mockRedisClient.srem).toHaveBeenCalled()
    })

    it('should return false for non-existent algorithm', async () => {
      mockRedisClient.hgetall.mockResolvedValue({})

      const result = await algorithmDb.deleteAlgorithm('non-existent-id')

      expect(result).toBe(false)
    })
  })

  describe('createAudit', () => {
    it('should create audit record successfully', async () => {
      const auditData = {
        algorithmId: 'test-algorithm-id',
        auditorAddress: '0xauditor123',
        status: 'approved' as AlgorithmStatus,
        comments: 'Algorithm looks good',
        securityScore: 95,
        performanceScore: 88,
        codeQualityScore: 92
      }

      mockRedisClient.hmset.mockResolvedValue('OK')
      mockRedisClient.lpush.mockResolvedValue(1)

      const result = await algorithmDb.createAudit(auditData)

      expect(result.algorithmId).toBe(auditData.algorithmId)
      expect(result.status).toBe(auditData.status)
      expect(result.securityScore).toBe(auditData.securityScore)
      expect(mockRedisClient.hmset).toHaveBeenCalled()
      expect(mockRedisClient.lpush).toHaveBeenCalled()
    })
  })

  describe('getStatistics', () => {
    it('should return algorithm statistics', async () => {
      mockRedisClient.keys.mockResolvedValue(['algorithm:1', 'algorithm:2', 'algorithm:3'])
      mockRedisClient.hgetall.mockResolvedValue({
        status: 'approved',
        computationType: 'third_party',
        authorAddress: '0x123'
      })

      const result = await algorithmDb.getStatistics()

      expect(result).toHaveProperty('totalAlgorithms')
      expect(result).toHaveProperty('algorithmsByStatus')
      expect(result).toHaveProperty('algorithmsByType')
      expect(result).toHaveProperty('totalAuthors')
      expect(typeof result.totalAlgorithms).toBe('number')
    })
  })
})