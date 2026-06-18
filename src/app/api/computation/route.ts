import { NextRequest, NextResponse } from 'next/server'
import { 
  asyncHandler, 
  parseRequestBody,
  createSuccessResponse, 
  createErrorResponse,
  ValidationException,
  validateRequired,
  getPaginationParams,
  getQueryParams
} from '@/lib/api/utils'
import { ComputationRequest, PaginatedResponse } from '@/lib/api/types'
import { authenticateRequest, requireRole, logAuditEvent } from '@/lib/api/middleware'
import { redis } from '@/lib/redis'

// GET /api/computation - List computation requests
export const GET = asyncHandler(async (request: NextRequest) => {
  const { user } = await authenticateRequest(request)
  const { page, limit, offset } = getPaginationParams(request)
  const params = getQueryParams(request)
  
  try {
    // Build filter criteria
    const filters: any = {}
    
    if (params.status) filters.status = params.status
    if (params.algorithm) filters.algorithm = params.algorithm
    if (params.requesterId) filters.requesterId = params.requesterId
    
    // Role-based filtering
    if (user.role === 'data_consumer') {
      filters.requesterId = user.id // Only show own requests
    }
    
    const computations = await getFilteredComputations(filters, offset, limit)
    const total = await getComputationCount(filters)
    
    const response: PaginatedResponse<ComputationRequest> = {
      success: true,
      data: computations,
      timestamp: new Date().toISOString(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
    
    return createSuccessResponse(response.data, undefined, 200)
    
  } catch (error) {
    console.error('Error fetching computations:', error)
    return createErrorResponse('Failed to fetch computations', 500)
  }
})

// POST /api/computation - Create new computation request
export const POST = asyncHandler(async (request: NextRequest) => {
  const { user } = await authenticateRequest(request)
  
  // Only data consumers can create computation requests
  requireRole(user.role, ['data_consumer', 'admin'])
  
  try {
    const body = await parseRequestBody(request)
    
    // Validate required fields
    const validationErrors = validateRequired(body, [
      'title', 'description', 'datasets', 'algorithm', 'budget'
    ])
    if (validationErrors.length > 0) {
      throw new ValidationException(validationErrors)
    }
    
    // Validate datasets exist and are approved
    const datasetValidation = await validateDatasets(body.datasets)
    if (!datasetValidation.valid) {
      throw new ValidationException(datasetValidation.errors)
    }
    
    // Generate computation request ID
    const requestId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Calculate estimated fees
    const feeEstimate = await calculateComputationFees(body.datasets, body.algorithm)
    
    // Create computation request
    const computationRequest: ComputationRequest = {
      id: requestId,
      title: body.title,
      description: body.description,
      datasets: body.datasets,
      algorithm: {
        type: body.algorithm.type,
        name: body.algorithm.name || body.algorithm.type,
        version: body.algorithm.version || '1.0.0',
        description: body.algorithm.description || '',
        parameters: body.algorithm.parameters || [],
        requirements: body.algorithm.requirements || {
          minDatasets: 1,
          requiredDataTypes: [],
          computeRequirements: {
            memory: 1024,
            cpu: 1,
            estimatedTime: 300
          }
        }
      },
      parameters: body.parameters || {},
      privacy: body.privacy || {
        noiseLevel: 'medium',
        resultAggregation: 'average'
      },
      budget: {
        ...body.budget,
        maxCost: feeEstimate.totalCost
      },
      status: 'pending',
      requesterId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Store computation request
    await redis.setex(
      `computation:${requestId}`, 
      90 * 24 * 60 * 60, 
      JSON.stringify(computationRequest)
    )
    
    // Create audit request for approval
    await createAuditRequest(requestId, computationRequest)
    
    // Log audit event
    await logAuditEvent(
      'computation_request_created',
      user.id,
      user.role,
      { 
        requestId, 
        title: body.title,
        datasets: body.datasets,
        algorithm: body.algorithm.type
      },
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    )
    
    return createSuccessResponse(
      { 
        computation: computationRequest,
        feeEstimate 
      }, 
      'Computation request created successfully',
      201
    )
    
  } catch (error) {
    if (error instanceof ValidationException) {
      throw error
    }
    console.error('Error creating computation request:', error)
    return createErrorResponse('Failed to create computation request', 500)
  }
})

// Helper functions
async function getFilteredComputations(
  filters: any, 
  offset: number, 
  limit: number
): Promise<ComputationRequest[]> {
  try {
    const keys = await redis.keys('computation:*')
    const computations: ComputationRequest[] = []
    
    for (const key of keys) {
      const computationData = await redis.get(key)
      if (!computationData) continue
      
      const computation: ComputationRequest = JSON.parse(computationData)
      
      // Apply filters
      if (filters.status && computation.status !== filters.status) continue
      if (filters.algorithm && computation.algorithm.type !== filters.algorithm) continue
      if (filters.requesterId && computation.requesterId !== filters.requesterId) continue
      
      computations.push(computation)
    }
    
    // Sort by creation date (newest first)
    computations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    return computations.slice(offset, offset + limit)
    
  } catch (error) {
    console.error('Error filtering computations:', error)
    return []
  }
}

async function getComputationCount(filters: any): Promise<number> {
  try {
    const keys = await redis.keys('computation:*')
    let count = 0
    
    for (const key of keys) {
      const computationData = await redis.get(key)
      if (!computationData) continue
      
      const computation: ComputationRequest = JSON.parse(computationData)
      
      // Apply same filters
      if (filters.status && computation.status !== filters.status) continue
      if (filters.algorithm && computation.algorithm.type !== filters.algorithm) continue
      if (filters.requesterId && computation.requesterId !== filters.requesterId) continue
      
      count++
    }
    
    return count
    
  } catch (error) {
    console.error('Error counting computations:', error)
    return 0
  }
}

async function validateDatasets(datasetIds: string[]): Promise<{
  valid: boolean
  errors: any[]
}> {
  const errors: any[] = []
  
  if (!Array.isArray(datasetIds) || datasetIds.length === 0) {
    errors.push({
      field: 'datasets',
      message: 'At least one dataset is required'
    })
    return { valid: false, errors }
  }
  
  for (const datasetId of datasetIds) {
    const datasetData = await redis.get(`dataset:${datasetId}`)
    
    if (!datasetData) {
      errors.push({
        field: 'datasets',
        message: `Dataset ${datasetId} not found`
      })
      continue
    }
    
    const dataset = JSON.parse(datasetData)
    
    if (dataset.status !== 'approved') {
      errors.push({
        field: 'datasets',
        message: `Dataset ${datasetId} is not approved for computation`
      })
    }
  }
  
  return { valid: errors.length === 0, errors }
}

async function calculateComputationFees(datasetIds: string[], algorithm: any): Promise<{
  baseFee: number
  dataFee: number
  computeFee: number
  totalCost: number
  currency: string
}> {
  try {
    // Get dataset pricing
    let dataFee = 0
    for (const datasetId of datasetIds) {
      const datasetData = await redis.get(`dataset:${datasetId}`)
      if (datasetData) {
        const dataset = JSON.parse(datasetData)
        dataFee += dataset.pricing.basePrice + (dataset.pricing.computationFee || 0)
      }
    }
    
    // Calculate compute fee based on algorithm complexity
    const algorithmMultiplier = {
      'federated_learning': 2.0,
      'secure_aggregation': 1.5,
      'privacy_preserving_analytics': 1.2,
      'differential_privacy': 1.3,
      'homomorphic_encryption': 3.0,
      'secure_multiparty_computation': 2.5
    }
    
    const baseFee = 0.01 // Base fee in ETH
    const multiplier = algorithmMultiplier[algorithm.type] || 1.0
    const computeFee = baseFee * multiplier * datasetIds.length
    
    return {
      baseFee,
      dataFee,
      computeFee,
      totalCost: baseFee + dataFee + computeFee,
      currency: 'ETH'
    }
    
  } catch (error) {
    console.error('Error calculating fees:', error)
    return {
      baseFee: 0.01,
      dataFee: 0,
      computeFee: 0.01,
      totalCost: 0.02,
      currency: 'ETH'
    }
  }
}

async function createAuditRequest(requestId: string, computation: ComputationRequest): Promise<void> {
  try {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const auditRequest = {
      id: auditId,
      type: 'algorithm_verification',
      targetId: requestId,
      targetType: 'computation',
      priority: 'medium',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      description: `Review computation request: ${computation.title}`,
      requirements: [
        {
          category: 'privacy',
          description: 'Verify privacy parameters and protections',
          criteria: ['noise_levels', 'aggregation_method', 'data_minimization'],
          mandatory: true
        },
        {
          category: 'algorithm',
          description: 'Validate algorithm parameters and safety',
          criteria: ['parameter_bounds', 'result_validation', 'resource_limits'],
          mandatory: true
        }
      ],
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await redis.setex(`audit:${auditId}`, 90 * 24 * 60 * 60, JSON.stringify(auditRequest))
    
  } catch (error) {
    console.error('Error creating audit request:', error)
  }
}