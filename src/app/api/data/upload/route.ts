import { NextRequest, NextResponse } from 'next/server'
import { 
  asyncHandler, 
  parseRequestBody,
  createSuccessResponse, 
  createErrorResponse,
  ValidationException,
  validateRequired,
  validateFileSize,
  validateFileType
} from '@/lib/api/utils'
import { Dataset, FileUploadRequest, FileUploadResponse } from '@/lib/api/types'
import { authenticateRequest, requireRole, logAuditEvent } from '@/lib/api/middleware'
import { redis } from '@/lib/redis'
import { registerDataOnChain } from '@/lib/contracts/onchain'
import { config } from '@/lib/config'

// POST /api/data/upload - Upload and register a new dataset
export const POST = asyncHandler(async (request: NextRequest) => {
  const { user } = await authenticateRequest(request)
  
  // Only data providers can upload datasets
  requireRole(user.role, ['data_provider', 'admin'])
  
  try {
    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const metadataStr = formData.get('metadata') as string
    const encryptionStr = formData.get('encryption') as string
    
    if (!file || !metadataStr) {
      throw new ValidationException([
        { field: 'file', message: 'File is required' },
        { field: 'metadata', message: 'Metadata is required' }
      ])
    }
    
    const metadata = JSON.parse(metadataStr)
    const encryption = encryptionStr ? JSON.parse(encryptionStr) : null
    
    // Validate file
    const maxSize = 500 // 500MB
    const allowedTypes = [
      'text/csv',
      'application/json',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ]
    
    if (!validateFileSize(file, maxSize)) {
      throw new ValidationException([{
        field: 'file',
        message: `File size must be less than ${maxSize}MB`
      }])
    }
    
    if (!validateFileType(file, allowedTypes)) {
      throw new ValidationException([{
        field: 'file',
        message: 'Unsupported file type'
      }])
    }
    
    // Validate metadata
    const validationErrors = validateRequired(metadata, [
      'name', 'description', 'category', 'pricing'
    ])
    if (validationErrors.length > 0) {
      throw new ValidationException(validationErrors)
    }
    
    // Generate dataset ID
    const datasetId = `dataset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Process file upload
    const uploadResult = await processFileUpload(file, datasetId, encryption)
    
    if (!uploadResult.success) {
      return createErrorResponse(uploadResult.error || 'File upload failed', 500)
    }
    
    // Create dataset record
    const dataset: Dataset = {
      id: datasetId,
      name: metadata.name,
      description: metadata.description,
      category: metadata.category,
      size: file.size,
      format: file.type,
      metadata: {
        tags: metadata.tags || [],
        industry: metadata.industry || '',
        region: metadata.region || 'global',
        timeRange: metadata.timeRange,
        qualityScore: 0, // Will be calculated later
        licenseType: metadata.licenseType || 'custom',
        usageRestrictions: metadata.usageRestrictions || []
      },
      privacy: metadata.privacy || {
        encryptionLevel: 'basic',
        anonymizationLevel: 'basic',
        accessControls: [],
        retentionPolicy: {
          duration: 365,
          autoDelete: false
        }
      },
      compliance: {
        gdpr: false,
        ccpa: false,
        hipaa: false,
        sox: false,
        custom: {}
      },
      pricing: metadata.pricing,
      status: 'pending_review',
      providerId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Store dataset in Redis
    await redis.setex(`dataset:${datasetId}`, 90 * 24 * 60 * 60, JSON.stringify(dataset)) // 90 days
    
    // Store file metadata
    const fileMetadata = {
      datasetId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      ipfsHash: uploadResult.ipfsHash,
      encryptionKey: uploadResult.encryptionKey,
      uploadedAt: new Date().toISOString()
    }
    
    await redis.setex(
      `dataset:${datasetId}:meta`,
      90 * 24 * 60 * 60,
      JSON.stringify(fileMetadata)
    )

    // Register the asset on-chain (DataRegistry) so it carries a verifiable
    // tx hash. Best-effort: if the chain is down the Redis record still stands.
    if (config.features.onchain) {
      const reg = await registerDataOnChain({
        datasetId,
        metadataURI: uploadResult.ipfsHash ? `ipfs://${uploadResult.ipfsHash}` : `ipfs://demo/${datasetId}`,
        category: metadata.category,
        tags: metadata.tags || [],
        isEncrypted: true,
        dataSize: file.size,
      })
      if (reg.success) {
        ;(dataset as any).onchain = {
          dataHash: reg.data?.dataHash,
          txHash: reg.txHash,
          blockNumber: reg.blockNumber,
          status: 'registered',
        }
        dataset.updatedAt = new Date().toISOString()
        await redis.setex(`dataset:${datasetId}`, 90 * 24 * 60 * 60, JSON.stringify(dataset))
      } else {
        console.warn('On-chain data registration skipped:', reg.error)
      }
    }

    // Log audit event
    await logAuditEvent(
      'dataset_upload',
      user.id,
      user.role,
      { 
        datasetId, 
        fileName: file.name, 
        fileSize: file.size,
        category: metadata.category 
      },
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    )
    
    const response: FileUploadResponse = {
      fileId: datasetId,
      ipfsHash: uploadResult.ipfsHash!,
      encryptionKey: uploadResult.encryptionKey!,
      status: 'completed',
      progress: 100
    }
    
    return createSuccessResponse(
      { dataset, upload: response }, 
      'Dataset uploaded successfully'
    )
    
  } catch (error) {
    console.error('Upload error:', error)
    if (error instanceof ValidationException) {
      throw error
    }
    return createErrorResponse('Upload failed', 500)
  }
})

// Helper function to process file upload
async function processFileUpload(
  file: File, 
  datasetId: string, 
  encryption: any
): Promise<{
  success: boolean
  ipfsHash?: string
  encryptionKey?: string
  error?: string
}> {
  try {
    // In a real implementation, this would:
    // 1. Encrypt the file using the specified encryption options
    // 2. Upload to IPFS
    // 3. Return the IPFS hash and encryption key
    
    // For now, simulate the process
    const fileBuffer = await file.arrayBuffer()
    
    // Simulate encryption
    const encryptionKey = `key_${Math.random().toString(36).substr(2, 32)}`
    
    // Simulate IPFS upload
    const ipfsHash = `Qm${Math.random().toString(36).substr(2, 44)}`
    
    // Store encrypted file data (in production, this would be on IPFS)
    await redis.setex(
      `file:${datasetId}`,
      90 * 24 * 60 * 60, // 90 days
      Buffer.from(fileBuffer).toString('base64')
    )
    
    return {
      success: true,
      ipfsHash,
      encryptionKey
    }
    
  } catch (error) {
    console.error('File processing error:', error)
    return {
      success: false,
      error: 'File processing failed'
    }
  }
}