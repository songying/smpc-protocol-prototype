import { NextRequest, NextResponse } from 'next/server'
import { 
  asyncHandler, 
  createSuccessResponse,
  AuthenticationException
} from '@/lib/api/utils'
import { redis } from '@/lib/redis'
import { authenticateRequest } from '@/lib/api/middleware'

// POST /api/auth/logout
export const POST = asyncHandler(async (request: NextRequest) => {
  // Authenticate the request
  const { user } = await authenticateRequest(request)
  
  if (!user) {
    throw new AuthenticationException()
  }
  
  try {
    // Remove refresh token from Redis
    await redis.del(`auth:refresh:${user.id}`)
    
    // Optionally: Add access token to blacklist
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      // Add token to blacklist with short expiration (15 minutes)
      await redis.setex(`auth:blacklist:${token}`, 15 * 60, '1')
    }
    
    return createSuccessResponse(null, 'Logged out successfully')
    
  } catch (error) {
    console.error('Logout error:', error)
    return createSuccessResponse(null, 'Logged out successfully') // Always succeed
  }
})