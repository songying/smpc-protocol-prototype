import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '../../../../src/app/api/algorithms/route'

// Mock dependencies
const mockAlgorithmDatabase = {
  listAlgorithms: jest.fn(),
  createAlgorithm: jest.fn(),
  updateAlgorithm: jest.fn(),
  deleteAlgorithm: jest.fn(),
  getStatistics: jest.fn(),
}

const mockAlgorithmEncryption = {
  encryptAlgorithmCode: jest.fn(),
}

const mockVerifyAuth = jest.fn()

jest.mock('../../../../src/lib/database/algorithm-schemas', () => ({
  algorithmDatabase: mockAlgorithmDatabase
}))

jest.mock('../../../../src/lib/crypto/algorithm-encryption', () => ({
  algorithmEncryption: mockAlgorithmEncryption
}))

jest.mock('../../../../src/lib/api/middleware', () => ({
  verifyAuth: mockVerifyAuth
}))

describe('/api/algorithms API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('GET /api/algorithms', () => {
    it('should return list of algorithms for authenticated user', async () => {
      const mockAlgorithms = [
        {
          id: 'algo1',
          name: 'Test Algorithm 1',
          status: 'approved',
          computationType: 'third_party',
          authorAddress: '0x123456789'
        },
        {
          id: 'algo2',
          name: 'Test Algorithm 2',
          status: 'pending',
          computationType: 'zk',
          authorAddress: '0x123456789'
        }
      ]

      mockVerifyAuth.mockResolvedValue({
        success: true,
        address: '0x123456789'
      })
      mockAlgorithmDatabase.listAlgorithms.mockResolvedValue(mockAlgorithms)

      const request = new NextRequest('http://localhost:3000/api/algorithms')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.algorithms).toEqual(mockAlgorithms)
      expect(mockAlgorithmDatabase.listAlgorithms).toHaveBeenCalledWith({
        authorAddress: '0x123456789'
      })
    })

    it('should return filtered algorithms by status', async () => {
      mockVerifyAuth.mockResolvedValue({
        success: true,
        address: '0x123456789'
      })
      mockAlgorithmDatabase.listAlgorithms.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/algorithms?status=approved&computationType=third_party')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockAlgorithmDatabase.listAlgorithms).toHaveBeenCalledWith({
        authorAddress: '0x123456789',
        status: 'approved',
        computationType: 'third_party'
      })
    })

    it('should return statistics when requested', async () => {
      const mockStats = {
        totalAlgorithms: 10,
        algorithmsByStatus: { approved: 7, pending: 2, rejected: 1 },
        algorithmsByType: { third_party: 5, zk: 3, fhe: 2 },
        totalAuthors: 3
      }

      mockVerifyAuth.mockResolvedValue({
        success: true,
        address: '0x123456789'
      })
      mockAlgorithmDatabase.getStatistics.mockResolvedValue(mockStats)

      const request = new NextRequest('http://localhost:3000/api/algorithms?view=statistics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockStats)
      expect(mockAlgorithmDatabase.getStatistics).toHaveBeenCalled()
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockVerifyAuth.mockResolvedValue({
        success: false,
        error: 'No authentication header'
      })

      const request = new NextRequest('http://localhost:3000/api/algorithms')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should handle database errors', async () => {
      mockVerifyAuth.mockResolvedValue({
        success: true,
        address: '0x123456789'
      })
      mockAlgorithmDatabase.listAlgorithms.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/algorithms')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/algorithms', () => {
    it('should create new algorithm successfully', async () => {
      const algorithmData = {
        name: 'New Algorithm',
        description: 'A new test algorithm',
        computationType: 'third_party',
        code: 'function compute(data) { return data * 2; }',
        isPublic: true,
        inputSchema: { type: 'number' },
        outputSchema: { type: 'number' }
      }

      const mockCreatedAlgorithm = {
        id: 'new-algo-id',
        ...algorithmData,
        status: 'pending',
        authorAddress: '0x123456789',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      mockVerifyAuth.mockResolvedValue({
        success: true,
        address: '0x123456789'
      })
      mockAlgorithmEncryption.encryptAlgorithmCode.mockResolvedValue('encrypted_code')
      mockAlgorithmDatabase.createAlgorithm.mockResolvedValue(mockCreatedAlgorithm)

      const request = new NextRequest('http://localhost:3000/api/algorithms', {
        method: 'POST',
        body: JSON.stringify(algorithmData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.algorithm).toEqual(mockCreatedAlgorithm)
      expect(mockAlgorithmEncryption.encryptAlgorithmCode).toHaveBeenCalledWith(
        algorithmData.code,
        '0x123456789'
      )
      expect(mockAlgorithmDatabase.createAlgorithm).toHaveBeenCalledWith({
        ...algorithmData,
        code: 'encrypted_code',
        authorAddress: '0x123456789'
      })
    })

    it('should validate required fields', async () => {
      const incompleteData = {
        name: 'New Algorithm',
        // missing required fields
      }

      mockVerifyAuth.mockResolvedValue({
        success: true,
        address: '0x123456789'
      })

      const request = new NextRequest('http://localhost:3000/api/algorithms', {
        method: 'POST',
        body: JSON.stringify(incompleteData)
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should handle encryption errors', async () => {
      const algorithmData = {
        name: 'New Algorithm',
        description: 'A new test algorithm',
        computationType: 'third_party',
        code: 'function compute(data) { return data * 2; }',
        isPublic: true,
        inputSchema: { type: 'number' },
        outputSchema: { type: 'number' }
      }

      mockVerifyAuth.mockResolvedValue({
        success: true,
        address: '0x123456789'
      })
      mockAlgorithmEncryption.encryptAlgorithmCode.mockRejectedValue(new Error('Encryption failed'))

      const request = new NextRequest('http://localhost:3000/api/algorithms', {
        method: 'POST',
        body: JSON.stringify(algorithmData)
      })
      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })

  describe('PUT /api/algorithms', () => {
    it('should update algorithm successfully', async () => {
      const updateData = {
        algorithmId: 'algo-123',
        name: 'Updated Algorithm',
        description: 'Updated description'
      }

      mockVerifyAuth.mockResolvedValue({
        success: true,
        address: '0x123456789'
      })
      mockAlgorithmDatabase.updateAlgorithm.mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/algorithms', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      const response = await PUT(request)

      expect(response.status).toBe(200)
      expect(mockAlgorithmDatabase.updateAlgorithm).toHaveBeenCalledWith(
        'algo-123',
        { name: 'Updated Algorithm', description: 'Updated description' }
      )
    })

    it('should require algorithmId', async () => {
      const updateData = {
        name: 'Updated Algorithm'
        // missing algorithmId
      }

      mockVerifyAuth.mockResolvedValue({
        success: true,
        address: '0x123456789'
      })

      const request = new NextRequest('http://localhost:3000/api/algorithms', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      const response = await PUT(request)

      expect(response.status).toBe(400)
    })

    it('should handle update failures', async () => {
      const updateData = {
        algorithmId: 'algo-123',
        name: 'Updated Algorithm'
      }

      mockVerifyAuth.mockResolvedValue({
        success: true,
        address: '0x123456789'
      })
      mockAlgorithmDatabase.updateAlgorithm.mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/algorithms', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      const response = await PUT(request)

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/algorithms', () => {
    it('should delete algorithm successfully', async () => {
      mockVerifyAuth.mockResolvedValue({
        success: true,
        address: '0x123456789'
      })
      mockAlgorithmDatabase.deleteAlgorithm.mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/algorithms?algorithmId=algo-123')
      const response = await DELETE(request)

      expect(response.status).toBe(200)
      expect(mockAlgorithmDatabase.deleteAlgorithm).toHaveBeenCalledWith('algo-123')
    })

    it('should require algorithmId parameter', async () => {
      mockVerifyAuth.mockResolvedValue({
        success: true,
        address: '0x123456789'
      })

      const request = new NextRequest('http://localhost:3000/api/algorithms')
      const response = await DELETE(request)

      expect(response.status).toBe(400)
    })

    it('should handle deletion failures', async () => {
      mockVerifyAuth.mockResolvedValue({
        success: true,
        address: '0x123456789'
      })
      mockAlgorithmDatabase.deleteAlgorithm.mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/algorithms?algorithmId=non-existent')
      const response = await DELETE(request)

      expect(response.status).toBe(404)
    })
  })
})