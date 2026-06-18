import { NextRequest, NextResponse } from 'next/server'
import { 
  asyncHandler, 
  parseRequestBody,
  createSuccessResponse, 
  createErrorResponse,
  ValidationException,
  NotFoundException
} from '@/lib/api/utils'
import { Dataset } from '@/lib/api/types'
import { authenticateRequest, requireResourceAccess, logAuditEvent } from '@/lib/api/middleware'
import { redis } from '@/lib/redis'

interface RouteContext {
  params: {
    id: string
  }
}

// GET /api/data/[id] - Get dataset by ID
export const GET = asyncHandler(async (request: NextRequest, context: RouteContext) => {
  const { user } = await authenticateRequest(request)
  const datasetId = context.params.id
  
  try {
    const datasetData = await redis.get(`dataset:${datasetId}`)
    
    if (!datasetData) {
      throw new NotFoundException('Dataset')
    }
    
    const dataset: Dataset = JSON.parse(datasetData)
    
    // Check access permissions
    if (user.role === 'data_provider') {
      requireResourceAccess(user.id, dataset.providerId, user.role)
    } else if (user.role === 'data_consumer') {
      // Consumers can only see approved datasets
      if (dataset.status !== 'approved') {
        throw new NotFoundException('Dataset')
      }
    }
    // Auditors and admins can see all datasets
    
    // Log audit event for data access
    await logAuditEvent(
      'dataset_view',
      user.id,
      user.role,
      { datasetId, datasetName: dataset.name },
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    )
    
    return createSuccessResponse(dataset, 'Dataset retrieved successfully')
    
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw error
    }
    console.error('Error fetching dataset:', error)
    return createErrorResponse('Failed to fetch dataset', 500)
  }
})

// PUT /api/data/[id] - Update dataset
export const PUT = asyncHandler(async (request: NextRequest, context: RouteContext) => {
  const { user } = await authenticateRequest(request)
  const datasetId = context.params.id
  
  try {
    const datasetData = await redis.get(`dataset:${datasetId}`)
    
    if (!datasetData) {
      throw new NotFoundException('Dataset')
    }
    
    const dataset: Dataset = JSON.parse(datasetData)
    
    // Check permissions (only owner or admin can update)
    requireResourceAccess(user.id, dataset.providerId, user.role)
    
    const updateData = await parseRequestBody(request)
    
    // Validate update permissions based on status
    if (dataset.status === 'approved' && user.role !== 'admin') {
      // Only certain fields can be updated for approved datasets
      const allowedFields = ['description', 'pricing', 'metadata']
      const updatedFields = Object.keys(updateData)
      const restrictedFields = updatedFields.filter(field => !allowedFields.includes(field))
      
      if (restrictedFields.length > 0) {
        throw new ValidationException([{
          field: 'update',
          message: `Cannot update fields [${restrictedFields.join(', ')}] for approved datasets`
        }])
      }
    }
    
    // Update dataset
    const updatedDataset: Dataset = {
      ...dataset,
      ...updateData,
      id: datasetId, // Ensure ID doesn't change
      providerId: dataset.providerId, // Ensure provider doesn't change
      createdAt: dataset.createdAt, // Ensure creation date doesn't change
      updatedAt: new Date().toISOString()
    }
    
    // If significant changes, reset to pending review
    if (updateData.name || updateData.category || updateData.privacy) {
      updatedDataset.status = 'pending_review'
    }
    
    // Store updated dataset
    await redis.setex(`dataset:${datasetId}`, 90 * 24 * 60 * 60, JSON.stringify(updatedDataset))
    
    // Log audit event
    await logAuditEvent(
      'dataset_update',
      user.id,
      user.role,
      { 
        datasetId, 
        datasetName: dataset.name,
        updatedFields: Object.keys(updateData)
      },
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    )
    
    return createSuccessResponse(updatedDataset, 'Dataset updated successfully')
    
  } catch (error) {
    if (error instanceof NotFoundException || error instanceof ValidationException) {
      throw error
    }
    console.error('Error updating dataset:', error)
    return createErrorResponse('Failed to update dataset', 500)
  }
})

// DELETE /api/data/[id] - Delete dataset
export const DELETE = asyncHandler(async (request: NextRequest, context: RouteContext) => {
  const { user } = await authenticateRequest(request)
  const datasetId = context.params.id
  
  try {
    const datasetData = await redis.get(`dataset:${datasetId}`)
    
    if (!datasetData) {
      throw new NotFoundException('Dataset')
    }
    
    const dataset: Dataset = JSON.parse(datasetData)
    
    // Check permissions (only owner or admin can delete)
    requireResourceAccess(user.id, dataset.providerId, user.role)
    
    // Check if dataset is being used in active computations
    const activeComputations = await checkActiveComputations(datasetId)
    if (activeComputations.length > 0) {
      throw new ValidationException([{
        field: 'dataset',
        message: 'Cannot delete dataset with active computations'
      }])
    }
    
    // Delete dataset and related data
    await redis.del(`dataset:${datasetId}`)
    await redis.del(`dataset:${datasetId}:meta`)
    await redis.del(`file:${datasetId}`)
    
    // Log audit event
    await logAuditEvent(
      'dataset_delete',
      user.id,
      user.role,
      { 
        datasetId, 
        datasetName: dataset.name 
      },
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    )
    
    return createSuccessResponse(null, 'Dataset deleted successfully')
    
  } catch (error) {
    if (error instanceof NotFoundException || error instanceof ValidationException) {
      throw error
    }
    console.error('Error deleting dataset:', error)
    return createErrorResponse('Failed to delete dataset', 500)
  }
})

// Helper function to check for active computations
async function checkActiveComputations(datasetId: string): Promise<string[]> {
  try {
    const computationKeys = await redis.keys('computation:*')
    const activeComputations: string[] = []
    
    for (const key of computationKeys) {
      const computationData = await redis.get(key)
      if (!computationData) continue
      
      const computation = JSON.parse(computationData)
      if (computation.datasets.includes(datasetId) && 
          ['pending', 'approved', 'computing'].includes(computation.status)) {
        activeComputations.push(computation.id)
      }
    }
    
    return activeComputations
    
  } catch (error) {
    console.error('Error checking active computations:', error)
    return []
  }
}