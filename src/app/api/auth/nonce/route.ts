import { NextRequest } from 'next/server'
import {
  asyncHandler,
  parseRequestBody,
  createSuccessResponse,
  ValidationException,
  validateRequired,
  validateEthereumAddress
} from '@/lib/api/utils'
import { redis } from '@/lib/redis'
import {
  CHALLENGE_TTL_SECONDS,
  challengeKey,
  createSignInChallenge
} from '@/lib/auth/sign-in-challenge'

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

  // Issue a challenge and persist the exact message the wallet must sign.
  // /api/auth/login verifies against this stored text, not the client's copy.
  const challenge = createSignInChallenge(address)
  await redis.setex(challengeKey(address), CHALLENGE_TTL_SECONDS, JSON.stringify(challenge))

  const response: NonceResponse = {
    nonce: challenge.nonce,
    message: challenge.message,
    expiresIn: CHALLENGE_TTL_SECONDS
  }

  return createSuccessResponse(response, 'Nonce generated successfully')
})
