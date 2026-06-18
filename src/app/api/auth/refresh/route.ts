import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { 
  asyncHandler, 
  parseRequestBody, 
  createSuccessResponse, 
  createErrorResponse,
  ValidationException,
  validateRequired,
  AuthenticationException
} from '@/lib/api/utils'
import { LoginResponse, User } from '@/lib/api/types'
import { redis } from '@/lib/redis'

interface RefreshRequest {
  refreshToken: string
}

// POST /api/auth/refresh
export const POST = asyncHandler(async (request: NextRequest) => {
  const body = await parseRequestBody<RefreshRequest>(request)
  
  // Validate required fields
  const validationErrors = validateRequired(body, ['refreshToken'])
  if (validationErrors.length > 0) {
    throw new ValidationException(validationErrors)
  }
  
  const { refreshToken } = body
  
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.NEXTAUTH_SECRET!) as any
    
    if (decoded.type !== 'refresh') {
      throw new AuthenticationException('Invalid token type')
    }
    
    const userId = decoded.userId
    
    // Check if refresh token exists in Redis
    const storedToken = await redis.get(`auth:refresh:${userId}`)
    if (!storedToken || storedToken !== refreshToken) {
      throw new AuthenticationException('Invalid refresh token')
    }
    
    // Get user data
    const userData = await redis.get(`user:${userId}`)
    if (!userData) {
      throw new AuthenticationException('User not found')
    }
    
    const user: User = JSON.parse(userData)
    
    // Generate new access token
    const newAccessToken = generateAccessToken(user)
    
    // Optionally generate new refresh token (token rotation)
    const newRefreshToken = generateRefreshToken(user)
    
    // Update stored refresh token
    await redis.setex(`auth:refresh:${userId}`, 7 * 24 * 60 * 60, newRefreshToken)
    
    const response: LoginResponse = {
      user,
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60 // 15 minutes
    }
    
    return createSuccessResponse(response, 'Token refreshed successfully')
    
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationException('Invalid refresh token')
    }
    throw error
  }
})

function generateAccessToken(user: User): string {
  const payload = {
    userId: user.id,
    address: user.address,
    role: user.role,
    type: 'access'
  }
  
  return jwt.sign(payload, process.env.NEXTAUTH_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    issuer: 'smpc-protocol',
    audience: 'smpc-platform'
  })
}

function generateRefreshToken(user: User): string {
  const payload = {
    userId: user.id,
    address: user.address,
    type: 'refresh'
  }
  
  return jwt.sign(payload, process.env.NEXTAUTH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
    issuer: 'smpc-protocol',
    audience: 'smpc-platform'
  })
}