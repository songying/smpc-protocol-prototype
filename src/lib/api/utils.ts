import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse, ApiError, ValidationError } from './types'

// Response helpers
export function createApiResponse<T>(
  data?: T,
  message?: string,
  success: boolean = true
): ApiResponse<T> {
  return {
    success,
    data,
    message,
    timestamp: new Date().toISOString()
  }
}

export function createErrorResponse(
  error: string,
  code: number = 400,
  details?: Record<string, any>
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    ...details
  }
  
  return NextResponse.json(response, { status: code })
}

export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  const response = createApiResponse(data, message, true)
  return NextResponse.json(response, { status })
}

// Error handling
export class ApiErrorHandler {
  static handle(error: unknown): NextResponse {
    console.error('API Error:', error)
    
    if (error instanceof ValidationException) {
      return createErrorResponse(
        'Validation failed',
        400,
        { validationErrors: error.errors }
      )
    }
    
    if (error instanceof AuthenticationException) {
      return createErrorResponse('Authentication required', 401)
    }
    
    if (error instanceof AuthorizationException) {
      return createErrorResponse('Insufficient permissions', 403)
    }
    
    if (error instanceof NotFoundException) {
      return createErrorResponse('Resource not found', 404)
    }
    
    if (error instanceof ConflictException) {
      return createErrorResponse('Resource conflict', 409)
    }
    
    if (error instanceof RateLimitException) {
      return createErrorResponse('Rate limit exceeded', 429)
    }
    
    // Default server error
    return createErrorResponse(
      process.env.NODE_ENV === 'development' 
        ? (error as Error).message 
        : 'Internal server error',
      500
    )
  }
}

// Custom exceptions
export class ValidationException extends Error {
  constructor(public errors: ValidationError[]) {
    super('Validation failed')
    this.name = 'ValidationException'
  }
}

export class AuthenticationException extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationException'
  }
}

export class AuthorizationException extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationException'
  }
}

export class NotFoundException extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found`)
    this.name = 'NotFoundException'
  }
}

export class ConflictException extends Error {
  constructor(message = 'Resource conflict') {
    super(message)
    this.name = 'ConflictException'
  }
}

export class RateLimitException extends Error {
  constructor(message = 'Rate limit exceeded') {
    super(message)
    this.name = 'RateLimitException'
  }
}

// Request helpers
export async function parseRequestBody<T>(request: NextRequest): Promise<T> {
  try {
    const contentType = request.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      return await request.json()
    }
    
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData()
      const body: any = {}
      
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          body[key] = value
        } else {
          try {
            body[key] = JSON.parse(value as string)
          } catch {
            body[key] = value
          }
        }
      }
      
      return body
    }
    
    throw new Error('Unsupported content type')
  } catch (error) {
    throw new ValidationException([{
      field: 'body',
      message: 'Invalid request body format'
    }])
  }
}

export function getQueryParams(request: NextRequest): Record<string, string> {
  const { searchParams } = new URL(request.url)
  const params: Record<string, string> = {}
  
  for (const [key, value] of searchParams.entries()) {
    params[key] = value
  }
  
  return params
}

export function getPaginationParams(request: NextRequest) {
  const params = getQueryParams(request)
  
  const page = Math.max(1, parseInt(params.page || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20')))
  const offset = (page - 1) * limit
  
  return { page, limit, offset }
}

// Validation helpers
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[]
): ValidationError[] {
  const errors: ValidationError[] = []
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors.push({
        field,
        message: `${field} is required`,
        value: data[field]
      })
    }
  }
  
  return errors
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateEthereumAddress(address: string): boolean {
  const addressRegex = /^0x[a-fA-F0-9]{40}$/
  return addressRegex.test(address)
}

export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}

// Security helpers
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .slice(0, 1000) // Limit length
}

export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

export function hashString(input: string): string {
  // Simple hash function - in production use crypto.subtle or similar
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}

// Rate limiting helpers
export function getRateLimitKey(request: NextRequest, identifier?: string): string {
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown'
  
  return identifier ? `${identifier}:${ip}` : ip
}

// CORS helpers
export function setCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400')
  
  return response
}

// Logging helpers
export function logApiRequest(
  request: NextRequest,
  response: NextResponse,
  duration: number,
  userId?: string
) {
  const log = {
    method: request.method,
    url: request.url,
    status: response.status,
    duration: `${duration}ms`,
    userId,
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString()
  }
  
  console.log('API Request:', JSON.stringify(log))
}

// Async handler wrapper
export function asyncHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now()
    
    try {
      const response = await handler(request, context)
      const duration = Date.now() - startTime
      
      // Log successful requests
      logApiRequest(request, response, duration)
      
      return setCorsHeaders(response)
    } catch (error) {
      const duration = Date.now() - startTime
      const errorResponse = ApiErrorHandler.handle(error)
      
      // Log error requests
      logApiRequest(request, errorResponse, duration)
      
      return setCorsHeaders(errorResponse)
    }
  }
}

// Data transformation helpers
export function transformDatabaseResult<T>(result: any): T {
  if (!result) return result
  
  // Convert database timestamps to ISO strings
  if (result.created_at) {
    result.createdAt = new Date(result.created_at).toISOString()
    delete result.created_at
  }
  
  if (result.updated_at) {
    result.updatedAt = new Date(result.updated_at).toISOString()
    delete result.updated_at
  }
  
  // Convert snake_case to camelCase
  const camelCased: any = {}
  for (const [key, value] of Object.entries(result)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    camelCased[camelKey] = value
  }
  
  return camelCased
}

export function transformToDatabase(data: Record<string, any>): Record<string, any> {
  const result: any = {}
  
  for (const [key, value] of Object.entries(data)) {
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
    
    // Convert ISO strings to database timestamps
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      result[snakeKey] = new Date(value)
    } else {
      result[snakeKey] = value
    }
  }
  
  return result
}