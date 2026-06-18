import CryptoJS from 'crypto-js'

export interface EncryptionResult {
  success: boolean
  encryptedData?: string
  key?: string
  iv?: string
  error?: string
}

export interface DecryptionResult {
  success: boolean
  decryptedData?: Buffer
  error?: string
}

export interface EncryptionOptions {
  algorithm: 'AES' | 'AES-GCM' | 'ChaCha20'
  keySize: 128 | 256
  mode?: 'CBC' | 'GCM' | 'CTR'
}

class EncryptionService {
  
  // AES Encryption
  async encryptWithAES(
    data: Buffer, 
    options: EncryptionOptions = { algorithm: 'AES', keySize: 256, mode: 'GCM' }
  ): Promise<EncryptionResult> {
    try {
      // Generate random key and IV
      const key = CryptoJS.lib.WordArray.random(options.keySize / 8)
      const iv = CryptoJS.lib.WordArray.random(16) // 128 bits
      
      // Convert buffer to CryptoJS format
      const wordArray = CryptoJS.lib.WordArray.create(data)
      
      let encrypted: CryptoJS.lib.CipherParams
      
      if (options.mode === 'GCM') {
        encrypted = CryptoJS.AES.encrypt(wordArray, key, {
          iv: iv,
          mode: CryptoJS.mode.GCM,
          padding: CryptoJS.pad.NoPadding
        })
      } else if (options.mode === 'CTR') {
        encrypted = CryptoJS.AES.encrypt(wordArray, key, {
          iv: iv,
          mode: CryptoJS.mode.CTR,
          padding: CryptoJS.pad.NoPadding
        })
      } else {
        // Default to CBC
        encrypted = CryptoJS.AES.encrypt(wordArray, key, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        })
      }
      
      return {
        success: true,
        encryptedData: encrypted.toString(),
        key: key.toString(CryptoJS.enc.Base64),
        iv: iv.toString(CryptoJS.enc.Base64)
      }
      
    } catch (error) {
      console.error('AES encryption error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Encryption failed'
      }
    }
  }
  
  async decryptWithAES(
    encryptedData: string,
    key: string,
    iv: string,
    options: EncryptionOptions = { algorithm: 'AES', keySize: 256, mode: 'GCM' }
  ): Promise<DecryptionResult> {
    try {
      const keyWordArray = CryptoJS.enc.Base64.parse(key)
      const ivWordArray = CryptoJS.enc.Base64.parse(iv)
      
      let decrypted: CryptoJS.lib.WordArray
      
      if (options.mode === 'GCM') {
        decrypted = CryptoJS.AES.decrypt(encryptedData, keyWordArray, {
          iv: ivWordArray,
          mode: CryptoJS.mode.GCM,
          padding: CryptoJS.pad.NoPadding
        })
      } else if (options.mode === 'CTR') {
        decrypted = CryptoJS.AES.decrypt(encryptedData, keyWordArray, {
          iv: ivWordArray,
          mode: CryptoJS.mode.CTR,
          padding: CryptoJS.pad.NoPadding
        })
      } else {
        // Default to CBC
        decrypted = CryptoJS.AES.decrypt(encryptedData, keyWordArray, {
          iv: ivWordArray,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        })
      }
      
      // Convert back to buffer
      const decryptedBytes = this.wordArrayToBuffer(decrypted)
      
      return {
        success: true,
        decryptedData: decryptedBytes
      }
      
    } catch (error) {
      console.error('AES decryption error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Decryption failed'
      }
    }
  }
  
  // Streaming encryption for large files
  async encryptFileStream(
    fileBuffer: Buffer,
    options: EncryptionOptions = { algorithm: 'AES', keySize: 256, mode: 'GCM' },
    chunkSize: number = 64 * 1024 // 64KB chunks
  ): Promise<EncryptionResult> {
    try {
      const key = CryptoJS.lib.WordArray.random(options.keySize / 8)
      const encryptedChunks: string[] = []
      
      // Process file in chunks
      for (let i = 0; i < fileBuffer.length; i += chunkSize) {
        const chunk = fileBuffer.slice(i, i + chunkSize)
        const iv = CryptoJS.lib.WordArray.random(16)
        
        const chunkWordArray = CryptoJS.lib.WordArray.create(chunk)
        
        const encrypted = CryptoJS.AES.encrypt(chunkWordArray, key, {
          iv: iv,
          mode: CryptoJS.mode.GCM,
          padding: CryptoJS.pad.NoPadding
        })
        
        // Store IV + encrypted data for each chunk
        encryptedChunks.push(iv.toString(CryptoJS.enc.Base64) + ':' + encrypted.toString())
      }
      
      return {
        success: true,
        encryptedData: encryptedChunks.join('|'),
        key: key.toString(CryptoJS.enc.Base64)
      }
      
    } catch (error) {
      console.error('Stream encryption error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stream encryption failed'
      }
    }
  }
  
  async decryptFileStream(
    encryptedData: string,
    key: string
  ): Promise<DecryptionResult> {
    try {
      const keyWordArray = CryptoJS.enc.Base64.parse(key)
      const chunks = encryptedData.split('|')
      const decryptedChunks: Buffer[] = []
      
      for (const chunk of chunks) {
        const [ivBase64, encryptedChunk] = chunk.split(':')
        const ivWordArray = CryptoJS.enc.Base64.parse(ivBase64)
        
        const decrypted = CryptoJS.AES.decrypt(encryptedChunk, keyWordArray, {
          iv: ivWordArray,
          mode: CryptoJS.mode.GCM,
          padding: CryptoJS.pad.NoPadding
        })
        
        const decryptedBytes = this.wordArrayToBuffer(decrypted)
        decryptedChunks.push(decryptedBytes)
      }
      
      // Combine all chunks
      const totalSize = decryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const result = Buffer.alloc(totalSize)
      let offset = 0
      
      for (const chunk of decryptedChunks) {
        chunk.copy(result, offset)
        offset += chunk.length
      }
      
      return {
        success: true,
        decryptedData: result
      }
      
    } catch (error) {
      console.error('Stream decryption error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stream decryption failed'
      }
    }
  }
  
  // Key derivation from password
  deriveKeyFromPassword(
    password: string,
    salt?: string,
    iterations: number = 10000
  ): {
    key: string
    salt: string
  } {
    const saltWordArray = salt 
      ? CryptoJS.enc.Base64.parse(salt)
      : CryptoJS.lib.WordArray.random(128 / 8)
    
    const key = CryptoJS.PBKDF2(password, saltWordArray, {
      keySize: 256 / 32,
      iterations: iterations
    })
    
    return {
      key: key.toString(CryptoJS.enc.Base64),
      salt: saltWordArray.toString(CryptoJS.enc.Base64)
    }
  }
  
  // Generate secure random key
  generateSecureKey(keySize: 128 | 256 = 256): string {
    const key = CryptoJS.lib.WordArray.random(keySize / 8)
    return key.toString(CryptoJS.enc.Base64)
  }
  
  // Hash functions
  async hashData(data: Buffer, algorithm: 'SHA256' | 'SHA512' = 'SHA256'): Promise<string> {
    const wordArray = CryptoJS.lib.WordArray.create(data)
    
    if (algorithm === 'SHA512') {
      return CryptoJS.SHA512(wordArray).toString(CryptoJS.enc.Hex)
    } else {
      return CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex)
    }
  }
  
  // HMAC for data integrity
  async createHMAC(data: Buffer, key: string): Promise<string> {
    const wordArray = CryptoJS.lib.WordArray.create(data)
    const keyWordArray = CryptoJS.enc.Base64.parse(key)
    
    const hmac = CryptoJS.HmacSHA256(wordArray, keyWordArray)
    return hmac.toString(CryptoJS.enc.Base64)
  }
  
  async verifyHMAC(data: Buffer, key: string, expectedHmac: string): Promise<boolean> {
    try {
      const computedHmac = await this.createHMAC(data, key)
      return computedHmac === expectedHmac
    } catch (error) {
      console.error('HMAC verification error:', error)
      return false
    }
  }
  
  // Utility functions
  private wordArrayToBuffer(wordArray: CryptoJS.lib.WordArray): Buffer {
    const words = wordArray.words
    const sigBytes = wordArray.sigBytes
    const bytes = new Uint8Array(sigBytes)
    
    for (let i = 0; i < sigBytes; i++) {
      const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
      bytes[i] = byte
    }
    
    return Buffer.from(bytes)
  }
  
  // Secure file encryption with integrity check
  async secureEncryptFile(
    fileBuffer: Buffer,
    password?: string,
    options: EncryptionOptions = { algorithm: 'AES', keySize: 256, mode: 'GCM' }
  ): Promise<{
    success: boolean
    encryptedData?: string
    key?: string
    iv?: string
    hmac?: string
    salt?: string
    error?: string
  }> {
    try {
      let encryptionKey: string
      let salt: string | undefined
      
      if (password) {
        const derived = this.deriveKeyFromPassword(password)
        encryptionKey = derived.key
        salt = derived.salt
      } else {
        encryptionKey = this.generateSecureKey(options.keySize)
      }
      
      // Encrypt the file
      const encryptionResult = await this.encryptWithAES(fileBuffer, options)
      if (!encryptionResult.success) {
        return encryptionResult
      }
      
      // Create HMAC for integrity
      const hmac = await this.createHMAC(fileBuffer, encryptionKey)
      
      return {
        success: true,
        encryptedData: encryptionResult.encryptedData,
        key: encryptionKey,
        iv: encryptionResult.iv,
        hmac,
        salt
      }
      
    } catch (error) {
      console.error('Secure encryption error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Secure encryption failed'
      }
    }
  }
  
  async secureDecryptFile(
    encryptedData: string,
    key: string,
    iv: string,
    expectedHmac: string,
    options: EncryptionOptions = { algorithm: 'AES', keySize: 256, mode: 'GCM' }
  ): Promise<DecryptionResult> {
    try {
      // Decrypt the file
      const decryptionResult = await this.decryptWithAES(encryptedData, key, iv, options)
      if (!decryptionResult.success || !decryptionResult.decryptedData) {
        return decryptionResult
      }
      
      // Verify HMAC integrity
      const isValid = await this.verifyHMAC(decryptionResult.decryptedData, key, expectedHmac)
      if (!isValid) {
        return {
          success: false,
          error: 'File integrity verification failed'
        }
      }
      
      return decryptionResult
      
    } catch (error) {
      console.error('Secure decryption error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Secure decryption failed'
      }
    }
  }
}

// Create singleton instance
const encryptionService = new EncryptionService()

export default encryptionService
export { EncryptionService }