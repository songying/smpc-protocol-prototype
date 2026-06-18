import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { User, UserRole } from './types'
import { AuthenticationException, AuthorizationException } from './utils'
import { redis } from '@/lib/redis'

export interface AuthenticatedRequest {
  user: User
  token: string
}

// Authenticate request using JWT token
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedRequest> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationException('No authorization token provided')
  }
  
  const token = authHeader.substring(7)
  
  try {
    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`auth:blacklist:${token}`)
    if (isBlacklisted) {
      throw new AuthenticationException('Token has been revoked')
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any
    
    if (decoded.type !== 'access') {
      throw new AuthenticationException('Invalid token type')
    }
    
    // Get user data from Redis
    const userData = await redis.get(`user:${decoded.userId}`)
    if (!userData) {
      throw new AuthenticationException('User not found')
    }
    
    const user: User = JSON.parse(userData)
    
    return { user, token }
    
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationException('Invalid or expired token')
    }
    throw error
  }
}

// Check if user has required role
export function requireRole(userRole: UserRole, requiredRoles: UserRole[]): void {
  if (!requiredRoles.includes(userRole)) {
    throw new AuthorizationException(`Requires one of: ${requiredRoles.join(', ')}`)
  }
}

// Check if user can access resource
export function requireResourceAccess(
  userId: string, 
  resourceOwnerId: string, 
  userRole: UserRole
): void {
  // Admin and auditors can access all resources
  if (userRole === 'admin' || userRole === 'auditor') {
    return
  }
  
  // Users can only access their own resources
  if (userId !== resourceOwnerId) {
    throw new AuthorizationException('Access denied to this resource')
  }
}

// Rate limiting middleware
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<void> {
  const current = await redis.get(`rate_limit:${key}`)
  
  if (!current) {
    await redis.setex(`rate_limit:${key}`, Math.ceil(windowMs / 1000), '1')
    return
  }
  
  const count = parseInt(current)
  if (count >= limit) {
    throw new Error('Rate limit exceeded')
  }
  
  await redis.incr(`rate_limit:${key}`)
}

// CORS middleware
export function handleCors(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim())
  
  if (request.method === 'OPTIONS') {
    return true // Always allow preflight requests
  }
  
  if (process.env.NODE_ENV === 'development') {
    return true // Allow all origins in development
  }
  
  return !origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')
}

// Input sanitization middleware
export function sanitizeRequestBody(body: any): any {
  if (typeof body !== 'object' || body === null) {
    return body
  }
  
  const sanitized: any = Array.isArray(body) ? [] : {}
  
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      // Basic XSS prevention
      sanitized[key] = value
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .trim()
        .slice(0, 10000) // Limit string length
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeRequestBody(value)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

// Request validation middleware
export function validateContentType(request: NextRequest, allowedTypes: string[]): void {
  const contentType = request.headers.get('content-type')
  
  if (!contentType) {
    throw new Error('Content-Type header is required')
  }
  
  const isAllowed = allowedTypes.some(type => contentType.includes(type))
  if (!isAllowed) {
    throw new Error(`Unsupported content type. Allowed: ${allowedTypes.join(', ')}`)
  }
}

// Security headers middleware
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' wss: https:",
      "frame-ancestors 'none'"
    ].join('; ')
  }
}

// Audit logging middleware
export async function logAuditEvent(
  action: string,
  userId: string,
  userRole: UserRole,
  details: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const auditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    action,
    userId,
    userRole,
    timestamp: new Date().toISOString(),
    details,
    ipAddress,
    userAgent
  }

  // Store in Redis with 90-day retention
  await redis.setex(
    `audit:${auditEntry.id}`,
    90 * 24 * 60 * 60,
    JSON.stringify(auditEntry)
  )

  // Also add to user's audit trail
  await redis.lpush(`audit:user:${userId}`, JSON.stringify(auditEntry))
  await redis.ltrim(`audit:user:${userId}`, 0, 999) // Keep last 1000 entries
}

// Simplified auth verification for API routes
export async function verifyAuth(request: NextRequest): Promise<{
  success: boolean
  user?: User
  error?: string
}> {
  try {
    const auth = await authenticateRequest(request)
    return {
      success: true,
      user: auth.user
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    }
  }
}