import { randomBytes } from 'crypto'

/**
 * Server-side sign-in challenge (SIWE-style, EIP-191 personal_sign).
 *
 * The nonce endpoint issues a challenge and stores the *exact* message text in
 * Redis. The login endpoint must verify the wallet signature against that
 * stored text, never against a client-supplied string. Otherwise any message the
 * victim ever signed anywhere becomes a valid login credential (reported by
 * OneDollarAgent, 2026-09).
 */

export const CHALLENGE_TTL_SECONDS = 5 * 60

export interface SignInChallenge {
  nonce: string
  message: string
  issuedAt: string
}

/** Redis key for the pending challenge of an address (case-insensitive). */
export function challengeKey(address: string): string {
  return `auth:nonce:${address.toLowerCase()}`
}

/** 128-bit nonce from a CSPRNG (Math.random is not acceptable for auth). */
export function generateSecureNonce(): string {
  return randomBytes(16).toString('hex')
}

export function createSignInMessage(address: string, nonce: string, issuedAt: string): string {
  const domain = process.env.NEXT_PUBLIC_APP_URL || 'localhost:3000'

  return `Welcome to SMPC Protocol!

Click to sign in and accept the SMPC Protocol Terms of Service: ${domain}/terms

This request will not trigger a blockchain transaction or cost any gas fees.

Your authentication status will reset after 24 hours.

Wallet address:
${address}

Nonce:
${nonce}

Issued At:
${issuedAt}`
}

export function createSignInChallenge(address: string): SignInChallenge {
  const nonce = generateSecureNonce()
  const issuedAt = new Date().toISOString()
  return { nonce, issuedAt, message: createSignInMessage(address, nonce, issuedAt) }
}

export function parseStoredChallenge(raw: string | null): SignInChallenge | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (
      typeof parsed?.nonce === 'string' &&
      typeof parsed?.message === 'string' &&
      typeof parsed?.issuedAt === 'string'
    ) {
      return parsed as SignInChallenge
    }
  } catch {
    // legacy plain-string nonce or corrupt value: treat as no challenge
  }
  return null
}

export function isChallengeFresh(challenge: SignInChallenge, now: number = Date.now()): boolean {
  const issued = Date.parse(challenge.issuedAt)
  if (Number.isNaN(issued)) return false
  const age = now - issued
  return age >= 0 && age <= CHALLENGE_TTL_SECONDS * 1000
}
