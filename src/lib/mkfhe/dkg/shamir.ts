// Shamir's Secret Sharing Implementation
// Used for threshold cryptography in distributed key generation

import { SecretShare, ShamirConfig, ThresholdError } from './types'

/**
 * Shamir's Secret Sharing implementation for threshold cryptography
 */
export class ShamirSecretSharing {
  private config: ShamirConfig

  constructor(config?: Partial<ShamirConfig>) {
    // Default to a large prime suitable for cryptographic operations
    this.config = {
      prime: BigInt('2147483647'), // Large prime (2^31 - 1)
      generator: BigInt('2'),
      polynomialDegree: 2, // Will be set based on threshold
      ...config
    }
  }

  /**
   * Generate secret shares using Shamir's scheme
   * @param secret The secret value to share
   * @param threshold Minimum shares needed to reconstruct
   * @param numShares Total number of shares to generate
   * @param sessionId Session identifier
   * @returns Array of secret shares
   */
  generateShares(
    secret: bigint,
    threshold: number,
    numShares: number,
    sessionId: string
  ): SecretShare[] {
    if (threshold > numShares) {
      throw new ThresholdError('Threshold cannot be greater than number of shares')
    }

    if (threshold < 1) {
      throw new ThresholdError('Threshold must be at least 1')
    }

    // Generate random polynomial coefficients
    const coefficients: bigint[] = [secret] // a0 = secret
    
    for (let i = 1; i < threshold; i++) {
      coefficients.push(this.randomBigInt(this.config.prime))
    }

    // Generate shares by evaluating polynomial at different points
    const shares: SecretShare[] = []
    
    for (let x = 1; x <= numShares; x++) {
      const shareValue = this.evaluatePolynomial(coefficients, BigInt(x))
      
      shares.push({
        shareIndex: x,
        shareValue: shareValue,
        partyId: `party_${x}`, // Will be updated with actual party IDs
        threshold: threshold,
        sessionId: sessionId
      })
    }

    return shares
  }

  /**
   * Reconstruct secret from threshold number of shares
   * @param shares Array of secret shares (at least threshold number)
   * @returns Reconstructed secret
   */
  reconstructSecret(shares: SecretShare[]): bigint {
    if (shares.length === 0) {
      throw new ThresholdError('No shares provided for reconstruction')
    }

    const threshold = shares[0].threshold
    
    if (shares.length < threshold) {
      throw new ThresholdError(
        `Insufficient shares: need ${threshold}, got ${shares.length}`
      )
    }

    // Use only the required number of shares (first threshold shares)
    const usedShares = shares.slice(0, threshold)
    
    // Lagrange interpolation to reconstruct secret
    let secret = BigInt(0)
    
    for (let i = 0; i < usedShares.length; i++) {
      const xi = BigInt(usedShares[i].shareIndex)
      const yi = usedShares[i].shareValue
      
      // Calculate Lagrange basis polynomial
      let numerator = BigInt(1)
      let denominator = BigInt(1)
      
      for (let j = 0; j < usedShares.length; j++) {
        if (i !== j) {
          const xj = BigInt(usedShares[j].shareIndex)
          numerator = this.modMul(numerator, this.modSub(BigInt(0), xj))
          denominator = this.modMul(denominator, this.modSub(xi, xj))
        }
      }
      
      // Calculate modular inverse of denominator
      const denominatorInv = this.modInverse(denominator)
      
      // Add this term to the secret
      const term = this.modMul(
        this.modMul(yi, numerator),
        denominatorInv
      )
      
      secret = this.modAdd(secret, term)
    }

    return secret
  }

  /**
   * Verify that a share is valid for the given polynomial commitments
   * @param share Secret share to verify
   * @param commitments Polynomial commitments for verification
   * @returns Whether the share is valid
   */
  verifyShare(share: SecretShare, commitments: bigint[]): boolean {
    try {
      // Compute expected value using commitments
      const x = BigInt(share.shareIndex)
      let expectedValue = BigInt(0)
      
      for (let i = 0; i < commitments.length; i++) {
        const term = this.modMul(
          commitments[i],
          this.modPow(x, BigInt(i))
        )
        expectedValue = this.modAdd(expectedValue, term)
      }
      
      return share.shareValue === expectedValue
    } catch (error) {
      console.error('Share verification failed:', error)
      return false
    }
  }

  /**
   * Generate polynomial commitments for verifiable secret sharing
   * @param coefficients Polynomial coefficients
   * @returns Array of commitments
   */
  generateCommitments(coefficients: bigint[]): bigint[] {
    return coefficients.map(coeff => 
      this.modPow(this.config.generator, coeff)
    )
  }

  /**
   * Combine multiple secret shares (for key aggregation)
   * @param shareGroups Array of share arrays from different secrets
   * @returns Combined shares
   */
  combineShares(shareGroups: SecretShare[][]): SecretShare[] {
    if (shareGroups.length === 0) {
      return []
    }

    const numShares = shareGroups[0].length
    const threshold = shareGroups[0][0].threshold
    const sessionId = shareGroups[0][0].sessionId

    // Verify all groups have same structure
    for (const group of shareGroups) {
      if (group.length !== numShares || group[0].threshold !== threshold) {
        throw new ThresholdError('Inconsistent share groups for combination')
      }
    }

    const combinedShares: SecretShare[] = []

    for (let i = 0; i < numShares; i++) {
      let combinedValue = BigInt(0)
      
      for (const group of shareGroups) {
        combinedValue = this.modAdd(combinedValue, group[i].shareValue)
      }

      combinedShares.push({
        shareIndex: shareGroups[0][i].shareIndex,
        shareValue: combinedValue,
        partyId: shareGroups[0][i].partyId,
        threshold: threshold,
        sessionId: sessionId
      })
    }

    return combinedShares
  }

  // Private helper methods for modular arithmetic

  private evaluatePolynomial(coefficients: bigint[], x: bigint): bigint {
    let result = BigInt(0)
    let xPower = BigInt(1)
    
    for (const coeff of coefficients) {
      result = this.modAdd(result, this.modMul(coeff, xPower))
      xPower = this.modMul(xPower, x)
    }
    
    return result
  }

  private modAdd(a: bigint, b: bigint): bigint {
    return (a + b) % this.config.prime
  }

  private modSub(a: bigint, b: bigint): bigint {
    return ((a - b) % this.config.prime + this.config.prime) % this.config.prime
  }

  private modMul(a: bigint, b: bigint): bigint {
    return (a * b) % this.config.prime
  }

  private modPow(base: bigint, exp: bigint): bigint {
    let result = BigInt(1)
    base = base % this.config.prime
    
    while (exp > 0) {
      if (exp % BigInt(2) === BigInt(1)) {
        result = this.modMul(result, base)
      }
      exp = exp / BigInt(2)
      base = this.modMul(base, base)
    }
    
    return result
  }

  private modInverse(a: bigint): bigint {
    // Extended Euclidean Algorithm for modular inverse
    let old_r = a
    let r = this.config.prime
    let old_s = BigInt(1)
    let s = BigInt(0)
    
    while (r !== BigInt(0)) {
      const quotient = old_r / r
      ;[old_r, r] = [r, old_r - quotient * r]
      ;[old_s, s] = [s, old_s - quotient * s]
    }
    
    if (old_r > BigInt(1)) {
      throw new Error('Modular inverse does not exist')
    }
    
    return old_s < 0 ? old_s + this.config.prime : old_s
  }

  private randomBigInt(max: bigint): bigint {
    // Generate a random bigint less than max
    // This is a simplified version - in production, use cryptographically secure random
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    
    let result = BigInt(0)
    for (let i = 0; i < bytes.length; i++) {
      result = (result << BigInt(8)) + BigInt(bytes[i])
    }
    
    return result % max
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ShamirConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): ShamirConfig {
    return { ...this.config }
  }
}