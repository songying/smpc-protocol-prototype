import { NextRequest, NextResponse } from 'next/server'
import { 
  asyncHandler, 
  parseRequestBody, 
  createSuccessResponse, 
  ValidationException,
  validateRequired,
  validateEthereumAddress,
  generateNonce
} from '@/lib/api/utils'
import { redis } from '@/lib/redis'

interface NonceRequest {
  address: string
}

interface NonceResponse {
  nonce: string
  message: string
  expiresIn: number
}

// POST /api/auth/nonce
export const POST = asyncHandler(async (request: NextRequest) => {
  const body = await parseRequestBody<NonceRequest>(request)
  
  // Validate required fields
  const validationErrors = validateRequired(body, ['address'])
  if (validationErrors.length > 0) {
    throw new ValidationException(validationErrors)
  }
  
  const { address } = body
  
  // Validate Ethereum address format
  if (!validateEthereumAddress(address)) {
    throw new ValidationException([{
      field: 'address',
      message: 'Invalid Ethereum address format'
    }])
  }
  
  // Generate a unique nonce
  const nonce = generateNonce()
  const expiresIn = 5 * 60 // 5 minutes
  
  // Store nonce in Redis with expiration
  await redis.setex(`auth:nonce:${address}`, expiresIn, nonce)
  
  // Create sign-in message
  const message = createSignInMessage(address, nonce)
  
  const response: NonceResponse = {
    nonce,
    message,
    expiresIn
  }
  
  return createSuccessResponse(response, 'Nonce generated successfully')
})

function createSignInMessage(address: string, nonce: string): string {
  const domain = process.env.NEXT_PUBLIC_APP_URL || 'localhost:3000'
  const timestamp = new Date().toISOString()
  
  return `Welcome to SMPC Protocol!

Click to sign in and accept the SMPC Protocol Terms of Service: ${domain}/terms

This request will not trigger a blockchain transaction or cost any gas fees.

Your authentication status will reset after 24 hours.

Wallet address:
${address}

Nonce:
${nonce}

Issued At:
${timestamp}`
}