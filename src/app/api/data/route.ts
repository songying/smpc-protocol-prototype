import { NextRequest, NextResponse } from 'next/server'
import { 
  asyncHandler, 
  createSuccessResponse, 
  createErrorResponse,
  getPaginationParams,
  getQueryParams
} from '@/lib/api/utils'
import { Dataset, PaginatedResponse } from '@/lib/api/types'
import { authenticateRequest, requireRole } from '@/lib/api/middleware'
import { redis } from '@/lib/redis'

// GET /api/data - List datasets with filtering and pagination
export const GET = asyncHandler(async (request: NextRequest) => {
  const { user } = await authenticateRequest(request)
  const { page, limit, offset } = getPaginationParams(request)
  const params = getQueryParams(request)
  
  try {
    // Build filter criteria
    const filters: any = {}
    
    if (params.category) filters.category = params.category
    if (params.status) filters.status = params.status
    if (params.providerId) filters.providerId = params.providerId
    if (params.search) filters.search = params.search.toLowerCase()
    
    // Role-based filtering
    if (user.role === 'data_provider') {
      filters.providerId = user.id // Only show own datasets
    } else if (user.role === 'data_consumer') {
      filters.status = 'approved' // Only show approved datasets
    }
    
    // Get datasets from Redis
    const datasets = await getFilteredDatasets(filters, offset, limit)
    const total = await getDatasetCount(filters)
    
    const response: PaginatedResponse<Dataset> = {
      success: true,
      data: datasets,
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
    console.error('Error fetching datasets:', error)
    return createErrorResponse('Failed to fetch datasets', 500)
  }
})

// Helper functions
async function getFilteredDatasets(
  filters: any, 
  offset: number, 
  limit: number
): Promise<Dataset[]> {
  try {
    // Get all dataset keys
    const keys = await redis.keys('dataset:*')
    const datasets: Dataset[] = []
    
    // Fetch all datasets and apply filters
    for (const key of keys) {
      if (key.includes(':meta')) continue // Skip metadata keys
      
      const datasetData = await redis.get(key)
      if (!datasetData) continue
      
      const dataset: Dataset = JSON.parse(datasetData)
      
      // Apply filters
      if (filters.category && dataset.category !== filters.category) continue
      if (filters.status && dataset.status !== filters.status) continue
      if (filters.providerId && dataset.providerId !== filters.providerId) continue
      if (filters.search) {
        const searchText = `${dataset.name} ${dataset.description} ${dataset.metadata.tags.join(' ')}`.toLowerCase()
        if (!searchText.includes(filters.search)) continue
      }
      
      datasets.push(dataset)
    }
    
    // Sort by creation date (newest first)
    datasets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    // Apply pagination
    return datasets.slice(offset, offset + limit)
    
  } catch (error) {
    console.error('Error filtering datasets:', error)
    return []
  }
}

async function getDatasetCount(filters: any): Promise<number> {
  try {
    const keys = await redis.keys('dataset:*')
    let count = 0
    
    for (const key of keys) {
      if (key.includes(':meta')) continue
      
      const datasetData = await redis.get(key)
      if (!datasetData) continue
      
      const dataset: Dataset = JSON.parse(datasetData)
      
      // Apply same filters as getFilteredDatasets
      if (filters.category && dataset.category !== filters.category) continue
      if (filters.status && dataset.status !== filters.status) continue
      if (filters.providerId && dataset.providerId !== filters.providerId) continue
      if (filters.search) {
        const searchText = `${dataset.name} ${dataset.description} ${dataset.metadata.tags.join(' ')}`.toLowerCase()
        if (!searchText.includes(filters.search)) continue
      }
      
      count++
    }
    
    return count
    
  } catch (error) {
    console.error('Error counting datasets:', error)
    return 0
  }
}