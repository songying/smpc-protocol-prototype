import encryptionService from './encryption'

export interface AlgorithmEncryptionResult {
  success: boolean
  encryptedCode?: string
  encryptionKey?: string
  iv?: string
  hmac?: string
  error?: string
}

export interface AlgorithmDecryptionResult {
  success: boolean
  decryptedCode?: string
  error?: string
}

export class AlgorithmEncryption {
  
  /**
   * Encrypts algorithm source code for secure storage
   * Uses AES-256-GCM with integrity verification
   */
  async encryptAlgorithmCode(
    sourceCode: string,
    userAddress: string
  ): Promise<AlgorithmEncryptionResult> {
    try {
      // Convert source code to buffer
      const codeBuffer = Buffer.from(sourceCode, 'utf-8')
      
      // Use secure file encryption with integrity check
      const result = await encryptionService.secureEncryptFile(codeBuffer)
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Algorithm encryption failed'
        }
      }
      
      // Add additional entropy using user address
      const userSalt = await this.createUserSalt(userAddress)
      const enhancedKey = await this.enhanceKey(result.key!, userSalt)
      
      return {
        success: true,
        encryptedCode: result.encryptedData!,
        encryptionKey: enhancedKey,
        iv: result.iv!,
        hmac: result.hmac!
      }
      
    } catch (error) {
      console.error('Algorithm encryption error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown encryption error'
      }
    }
  }
  
  /**
   * Decrypts algorithm source code for auditor review only
   * Only authorized auditors should be able to decrypt
   */
  async decryptAlgorithmCode(
    encryptedCode: string,
    encryptionKey: string,
    iv: string,
    hmac: string,
    userAddress: string
  ): Promise<AlgorithmDecryptionResult> {
    try {
      // Reverse the key enhancement process
      const userSalt = await this.createUserSalt(userAddress)
      const originalKey = await this.reverseEnhanceKey(encryptionKey, userSalt)
      
      // Decrypt the algorithm code
      const result = await encryptionService.secureDecryptFile(
        encryptedCode,
        originalKey,
        iv,
        hmac
      )
      
      if (!result.success || !result.decryptedData) {
        return {
          success: false,
          error: result.error || 'Algorithm decryption failed'
        }
      }
      
      // Convert buffer back to string
      const sourceCode = result.decryptedData.toString('utf-8')
      
      return {
        success: true,
        decryptedCode: sourceCode
      }
      
    } catch (error) {
      console.error('Algorithm decryption error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown decryption error'
      }
    }
  }
  
  /**
   * Validates algorithm source code for basic security checks
   * Performed before encryption
   */
  async validateAlgorithmCode(sourceCode: string): Promise<{
    isValid: boolean
    warnings: string[]
    errors: string[]
  }> {
    const warnings: string[] = []
    const errors: string[] = []
    
    try {
      // Basic validation checks
      if (!sourceCode || sourceCode.trim().length === 0) {
        errors.push('Algorithm source code cannot be empty')
        return { isValid: false, warnings, errors }
      }
      
      if (sourceCode.length > 1000000) { // 1MB limit
        errors.push('Algorithm source code exceeds maximum size limit (1MB)')
      }
      
      // Security pattern checks
      const securityPatterns = [
        {
          pattern: /eval\s*\(/gi,
          type: 'error',
          message: 'Use of eval() function is not allowed for security reasons'
        },
        {
          pattern: /exec\s*\(/gi,
          type: 'error',
          message: 'Use of exec() function is not allowed for security reasons'
        },
        {
          pattern: /require\s*\(\s*['"]child_process['"]\s*\)/gi,
          type: 'error',
          message: 'Direct access to child_process module is not allowed'
        },
        {
          pattern: /require\s*\(\s*['"]fs['"]\s*\)/gi,
          type: 'warning',
          message: 'File system access detected - ensure it\'s necessary and secure'
        },
        {
          pattern: /require\s*\(\s*['"]net['"]\s*\)/gi,
          type: 'warning',
          message: 'Network access detected - ensure it\'s necessary and secure'
        },
        {
          pattern: /require\s*\(\s*['"]http['"]\s*\)/gi,
          type: 'warning',
          message: 'HTTP access detected - ensure it\'s necessary and secure'
        },
        {
          pattern: /process\.env/gi,
          type: 'warning',
          message: 'Environment variable access detected - ensure no sensitive data exposure'
        },
        {
          pattern: /crypto\.randomBytes/gi,
          type: 'info',
          message: 'Cryptographic randomness detected - good practice'
        }
      ]
      
      for (const check of securityPatterns) {
        if (check.pattern.test(sourceCode)) {
          if (check.type === 'error') {
            errors.push(check.message)
          } else if (check.type === 'warning') {
            warnings.push(check.message)
          }
        }
      }
      
      // Check for common algorithm patterns
      const algorithmPatterns = [
        /function\s+[\w$]+\s*\(/gi,
        /const\s+[\w$]+\s*=/gi,
        /let\s+[\w$]+\s*=/gi,
        /var\s+[\w$]+\s*=/gi
      ]
      
      const hasAlgorithmStructure = algorithmPatterns.some(pattern => 
        pattern.test(sourceCode)
      )
      
      if (!hasAlgorithmStructure) {
        warnings.push('Algorithm code structure not clearly identified - ensure proper function definitions')
      }
      
      // Check for potential infinite loops (basic check)
      const loopPatterns = [
        /while\s*\(\s*true\s*\)/gi,
        /for\s*\(\s*;\s*;\s*\)/gi
      ]
      
      for (const pattern of loopPatterns) {
        if (pattern.test(sourceCode)) {
          warnings.push('Potential infinite loop detected - ensure proper exit conditions')
        }
      }
      
      return {
        isValid: errors.length === 0,
        warnings,
        errors
      }
      
    } catch (error) {
      console.error('Algorithm validation error:', error)
      return {
        isValid: false,
        warnings,
        errors: ['Algorithm validation failed due to internal error']
      }
    }
  }
  
  /**
   * Generates algorithm execution sandbox configuration
   */
  async generateSandboxConfig(algorithmId: string, computationType: 'third_party' | 'zk' | 'fhe'): Promise<{
    sandboxId: string
    timeoutMs: number
    memoryLimitMB: number
    allowedModules: string[]
    computationConfig: Record<string, any>
  }> {
    const sandboxId = `sandbox_${algorithmId}_${Date.now()}`
    
    const baseConfig = {
      sandboxId,
      timeoutMs: 300000, // 5 minutes default
      memoryLimitMB: 512, // 512MB default
      allowedModules: [
        'crypto',
        'util',
        'buffer',
        'stream',
        'events'
      ]
    }
    
    // Computation type specific configurations
    const computationConfigs = {
      third_party: {
        ...baseConfig,
        timeoutMs: 600000, // 10 minutes for third party
        memoryLimitMB: 1024, // 1GB for third party
        allowedModules: [
          ...baseConfig.allowedModules,
          'https',
          'url',
          'querystring'
        ],
        computationConfig: {
          allowNetworkAccess: true,
          maxNetworkRequests: 10,
          trustedEndpoints: []
        }
      },
      zk: {
        ...baseConfig,
        timeoutMs: 900000, // 15 minutes for ZK
        memoryLimitMB: 2048, // 2GB for ZK computations
        allowedModules: [
          ...baseConfig.allowedModules,
          'bigint'
        ],
        computationConfig: {
          allowNetworkAccess: false,
          zkProofGeneration: true,
          maxCircuitSize: 1000000
        }
      },
      fhe: {
        ...baseConfig,
        timeoutMs: 1800000, // 30 minutes for FHE
        memoryLimitMB: 4096, // 4GB for FHE operations
        allowedModules: [
          ...baseConfig.allowedModules,
          'node-seal'
        ],
        computationConfig: {
          allowNetworkAccess: false,
          fheOperations: true,
          encryptionScheme: 'BFV',
          polyModulusDegree: 4096
        }
      }
    }
    
    return computationConfigs[computationType]
  }
  
  /**
   * Creates a deterministic salt from user address for key enhancement
   */
  private async createUserSalt(userAddress: string): Promise<string> {
    const addressBuffer = Buffer.from(userAddress.toLowerCase(), 'utf-8')
    const saltHash = await encryptionService.hashData(addressBuffer, 'SHA256')
    return saltHash.substring(0, 32) // Use first 32 characters as salt
  }
  
  /**
   * Enhances encryption key with user-specific salt
   */
  private async enhanceKey(originalKey: string, userSalt: string): Promise<string> {
    const keyBuffer = Buffer.from(originalKey, 'base64')
    const saltBuffer = Buffer.from(userSalt, 'hex')
    
    // XOR the key with the salt for additional security
    const enhancedBuffer = Buffer.alloc(keyBuffer.length)
    for (let i = 0; i < keyBuffer.length; i++) {
      enhancedBuffer[i] = keyBuffer[i] ^ saltBuffer[i % saltBuffer.length]
    }
    
    return enhancedBuffer.toString('base64')
  }
  
  /**
   * Reverses the key enhancement process
   */
  private async reverseEnhanceKey(enhancedKey: string, userSalt: string): Promise<string> {
    // XOR is its own inverse, so we can use the same process
    return this.enhanceKey(enhancedKey, userSalt)
  }
  
  /**
   * Generates a secure hash of algorithm code for integrity checking
   */
  async generateAlgorithmHash(sourceCode: string): Promise<string> {
    const codeBuffer = Buffer.from(sourceCode, 'utf-8')
    return await encryptionService.hashData(codeBuffer, 'SHA256')
  }
  
  /**
   * Verifies algorithm code integrity
   */
  async verifyAlgorithmIntegrity(
    sourceCode: string, 
    expectedHash: string
  ): Promise<boolean> {
    try {
      const computedHash = await this.generateAlgorithmHash(sourceCode)
      return computedHash === expectedHash
    } catch (error) {
      console.error('Algorithm integrity verification error:', error)
      return false
    }
  }
}

// Create singleton instance
const algorithmEncryption = new AlgorithmEncryption()

export default algorithmEncryption