import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage } from 'viem'
import jwt from 'jsonwebtoken'
import { 
  asyncHandler, 
  parseRequestBody, 
  createSuccessResponse, 
  createErrorResponse,
  ValidationException,
  validateRequired,
  validateEthereumAddress,
  generateNonce
} from '@/lib/api/utils'
import { LoginRequest, LoginResponse, User, UserRole } from '@/lib/api/types'
import { redis } from '@/lib/redis'

// POST /api/auth/login
export const POST = asyncHandler(async (request: NextRequest) => {
  const body = await parseRequestBody<LoginRequest>(request)
  
  // Validate required fields
  const validationErrors = validateRequired(body, ['address', 'signature', 'message', 'nonce'])
  if (validationErrors.length > 0) {
    throw new ValidationException(validationErrors)
  }
  
  const { address, signature, message, nonce } = body
  
  // Validate Ethereum address format
  if (!validateEthereumAddress(address)) {
    throw new ValidationException([{
      field: 'address',
      message: 'Invalid Ethereum address format'
    }])
  }
  
  try {
    // Verify the nonce exists and hasn't expired
    const storedNonce = await redis.get(`auth:nonce:${address}`)
    if (!storedNonce || storedNonce !== nonce) {
      return createErrorResponse('Invalid or expired nonce', 401)
    }
    
    // Verify the signature
    const isValidSignature = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`
    })
    
    if (!isValidSignature) {
      return createErrorResponse('Invalid signature', 401)
    }
    
    // Delete used nonce
    await redis.del(`auth:nonce:${address}`)
    
    // Get or create user
    let user = await getUserByAddress(address)
    if (!user) {
      user = await createUser(address)
    }
    
    // Update last login
    await updateLastLogin(user.id)
    
    // Generate JWT tokens
    const token = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)
    
    // Store refresh token
    await redis.setex(`auth:refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken) // 7 days
    
    const response: LoginResponse = {
      user,
      token,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutes
    }
    
    return createSuccessResponse(response, 'Login successful')
    
  } catch (error) {
    console.error('Login error:', error)
    return createErrorResponse('Authentication failed', 401)
  }
})

// Helper functions
async function getUserByAddress(address: string): Promise<User | null> {
  try {
    const userData = await redis.get(`user:address:${address.toLowerCase()}`)
    if (!userData) return null
    
    const user = JSON.parse(userData)
    return user
  } catch (error) {
    console.error('Error getting user by address:', error)
    return null
  }
}

async function createUser(address: string): Promise<User> {
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const user: User = {
    id: userId,
    address: address.toLowerCase(),
    role: 'data_consumer', // Default role
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      preferences: {
        theme: 'system',
        notifications: {
          email: true,
          push: true,
          browser: true
        },
        privacy: {
          showProfile: false,
          showActivity: false
        }
      }
    }
  }
  
  // Store user data
  await redis.setex(`user:${userId}`, 30 * 24 * 60 * 60, JSON.stringify(user)) // 30 days
  await redis.setex(`user:address:${address.toLowerCase()}`, 30 * 24 * 60 * 60, JSON.stringify(user))
  
  return user
}

async function updateLastLogin(userId: string): Promise<void> {
  try {
    const userData = await redis.get(`user:${userId}`)
    if (userData) {
      const user = JSON.parse(userData)
      user.lastLoginAt = new Date().toISOString()
      user.updatedAt = new Date().toISOString()
      
      await redis.setex(`user:${userId}`, 30 * 24 * 60 * 60, JSON.stringify(user))
      await redis.setex(`user:address:${user.address}`, 30 * 24 * 60 * 60, JSON.stringify(user))
    }
  } catch (error) {
    console.error('Error updating last login:', error)
  }
}

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