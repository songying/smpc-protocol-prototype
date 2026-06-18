// Secure Key Storage and Rotation System
// Provides secure storage for DKG keys with rotation capabilities

import { SecretShare, KeyShare, KeyRotationSession, DKGError } from './types'

export interface StoredKey {
  id: string
  sessionId: string
  partyId: string
  keyType: 'secret_share' | 'public_key' | 'combined_key'
  keyData: any
  metadata: {
    createdAt: number
    lastUsed: number
    rotationCount: number
    version: string
    algorithm: string
  }
  accessControls: {
    minClearanceLevel: number
    allowedOperations: string[]
    expiryTime?: number
  }
}

export interface StorageConfig {
  encryptionKey?: string // Key for encrypting stored data
  compressionEnabled: boolean
  maxStorageSize: number // In bytes
  keyRetentionPeriod: number // In milliseconds
  autoRotationEnabled: boolean
  rotationInterval: number // In milliseconds
  backupEnabled: boolean
  auditEnabled: boolean
}

export interface KeyMetrics {
  totalKeys: number
  activeKeys: number
  expiredKeys: number
  storageUsed: number
  lastRotation?: number
  accessCount: number
}

/**
 * Secure key storage system with encryption and rotation
 */
export class SecureKeyStorage {
  private storage: Map<string, StoredKey> = new Map()
  private encryptedStorage: Map<string, string> = new Map()
  private accessLog: Array<{ keyId: string; operation: string; timestamp: number; partyId: string }> = []
  private config: StorageConfig
  private rotationSessions: Map<string, KeyRotationSession> = new Map()

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      encryptionKey: this.generateEncryptionKey(),
      compressionEnabled: true,
      maxStorageSize: 100 * 1024 * 1024, // 100MB
      keyRetentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
      autoRotationEnabled: true,
      rotationInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
      backupEnabled: true,
      auditEnabled: true,
      ...config
    }

    if (this.config.autoRotationEnabled) {
      this.startAutoRotation()
    }
  }

  /**
   * Store a key securely
   */
  async storeKey(
    keyId: string,
    sessionId: string,
    partyId: string,
    keyType: 'secret_share' | 'public_key' | 'combined_key',
    keyData: any,
    accessControls?: Partial<StoredKey['accessControls']>
  ): Promise<void> {
    try {
      const storedKey: StoredKey = {
        id: keyId,
        sessionId,
        partyId,
        keyType,
        keyData,
        metadata: {
          createdAt: Date.now(),
          lastUsed: Date.now(),
          rotationCount: 0,
          version: '1.0.0',
          algorithm: 'AES-256-GCM'
        },
        accessControls: {
          minClearanceLevel: 1,
          allowedOperations: ['read', 'decrypt'],
          ...accessControls
        }
      }

      // Check storage limits
      await this.checkStorageLimits()

      // Encrypt and store
      const encryptedData = await this.encryptKeyData(storedKey)
      this.encryptedStorage.set(keyId, encryptedData)
      this.storage.set(keyId, storedKey)

      this.logAccess(keyId, 'store', partyId)
      console.log(`Key ${keyId} stored securely for party ${partyId}`)
    } catch (error) {
      throw new DKGError(`Failed to store key: ${error}`, 'STORAGE_FAILED')
    }
  }

  /**
   * Retrieve a key securely
   */
  async retrieveKey(keyId: string, partyId: string, operation: string = 'read'): Promise<StoredKey | null> {
    try {
      const storedKey = this.storage.get(keyId)
      if (!storedKey) {
        return null
      }

      // Check access controls
      if (!this.checkAccessPermission(storedKey, partyId, operation)) {
        throw new DKGError('Access denied', 'ACCESS_DENIED')
      }

      // Check expiry
      if (this.isKeyExpired(storedKey)) {
        throw new DKGError('Key expired', 'KEY_EXPIRED')
      }

      // Update last used timestamp
      storedKey.metadata.lastUsed = Date.now()

      this.logAccess(keyId, operation, partyId)
      return storedKey
    } catch (error) {
      throw new DKGError(`Failed to retrieve key: ${error}`, 'RETRIEVAL_FAILED')
    }
  }

  /**
   * Rotate keys for a session
   */
  async rotateSessionKeys(sessionId: string, newSessionId: string): Promise<KeyRotationSession> {
    try {
      const rotationSession: KeyRotationSession = {
        sessionId: newSessionId,
        oldSessionId: sessionId,
        participants: this.getSessionParticipants(sessionId),
        threshold: this.getSessionThreshold(sessionId),
        status: 'initializing'
      }

      this.rotationSessions.set(newSessionId, rotationSession)
      rotationSession.status = 'rotating'

      // Get all keys for the old session
      const oldKeys = this.getSessionKeys(sessionId)

      for (const oldKey of oldKeys) {
        // Generate new key ID
        const newKeyId = `${oldKey.id}_rotated_${Date.now()}`

        // Create rotated key with updated metadata
        const rotatedKey: StoredKey = {
          ...oldKey,
          id: newKeyId,
          sessionId: newSessionId,
          metadata: {
            ...oldKey.metadata,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            rotationCount: oldKey.metadata.rotationCount + 1
          }
        }

        // Store the new key
        await this.storeKey(
          newKeyId,
          newSessionId,
          oldKey.partyId,
          oldKey.keyType,
          oldKey.keyData,
          oldKey.accessControls
        )

        // Mark old key for deletion (after retention period)
        this.scheduleKeyDeletion(oldKey.id)
      }

      rotationSession.status = 'completed'
      console.log(`Key rotation completed for session ${sessionId} -> ${newSessionId}`)
      
      return rotationSession
    } catch (error) {
      const rotationSession = this.rotationSessions.get(newSessionId)
      if (rotationSession) {
        rotationSession.status = 'failed'
      }
      throw new DKGError(`Key rotation failed: ${error}`, 'ROTATION_FAILED')
    }
  }

  /**
   * Delete a key securely
   */
  async deleteKey(keyId: string, partyId: string): Promise<void> {
    try {
      const storedKey = this.storage.get(keyId)
      if (!storedKey) {
        throw new DKGError('Key not found', 'KEY_NOT_FOUND')
      }

      if (!this.checkAccessPermission(storedKey, partyId, 'delete')) {
        throw new DKGError('Access denied for deletion', 'ACCESS_DENIED')
      }

      // Secure deletion
      this.storage.delete(keyId)
      this.encryptedStorage.delete(keyId)

      this.logAccess(keyId, 'delete', partyId)
      console.log(`Key ${keyId} securely deleted`)
    } catch (error) {
      throw new DKGError(`Failed to delete key: ${error}`, 'DELETION_FAILED')
    }
  }

  /**
   * List keys for a session
   */
  listSessionKeys(sessionId: string, partyId: string): StoredKey[] {
    return Array.from(this.storage.values()).filter(key => 
      key.sessionId === sessionId && 
      (key.partyId === partyId || this.hasAdminAccess(partyId)) &&
      !this.isKeyExpired(key)
    )
  }

  /**
   * Get storage metrics
   */
  getMetrics(): KeyMetrics {
    const allKeys = Array.from(this.storage.values())
    const activeKeys = allKeys.filter(key => !this.isKeyExpired(key))
    const expiredKeys = allKeys.filter(key => this.isKeyExpired(key))

    const storageUsed = JSON.stringify([...this.encryptedStorage.values()]).length

    return {
      totalKeys: allKeys.length,
      activeKeys: activeKeys.length,
      expiredKeys: expiredKeys.length,
      storageUsed,
      lastRotation: this.getLastRotationTime(),
      accessCount: this.accessLog.length
    }
  }

  /**
   * Export keys for backup (encrypted)
   */
  async exportBackup(sessionId?: string): Promise<string> {
    try {
      const keysToBackup = sessionId 
        ? Array.from(this.storage.values()).filter(key => key.sessionId === sessionId)
        : Array.from(this.storage.values())

      const backupData = {
        keys: keysToBackup,
        metadata: {
          exportTime: Date.now(),
          version: '1.0.0',
          sessionId
        }
      }

      return await this.encryptData(JSON.stringify(backupData))
    } catch (error) {
      throw new DKGError(`Backup export failed: ${error}`, 'BACKUP_FAILED')
    }
  }

  /**
   * Import keys from backup
   */
  async importBackup(encryptedBackup: string): Promise<void> {
    try {
      const decryptedData = await this.decryptData(encryptedBackup)
      const backupData = JSON.parse(decryptedData)

      for (const key of backupData.keys) {
        await this.storeKey(
          key.id,
          key.sessionId,
          key.partyId,
          key.keyType,
          key.keyData,
          key.accessControls
        )
      }

      console.log(`Imported ${backupData.keys.length} keys from backup`)
    } catch (error) {
      throw new DKGError(`Backup import failed: ${error}`, 'IMPORT_FAILED')
    }
  }

  /**
   * Clean up expired keys
   */
  cleanupExpiredKeys(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [keyId, key] of this.storage) {
      if (this.isKeyExpired(key)) {
        expiredKeys.push(keyId)
      }
    }

    for (const keyId of expiredKeys) {
      this.storage.delete(keyId)
      this.encryptedStorage.delete(keyId)
      console.log(`Cleaned up expired key: ${keyId}`)
    }

    // Also clean up old access logs
    this.accessLog = this.accessLog.filter(
      log => now - log.timestamp < this.config.keyRetentionPeriod
    )
  }

  // Private helper methods

  private generateEncryptionKey(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  private async encryptKeyData(key: StoredKey): Promise<string> {
    // Simplified encryption - in production, use proper cryptographic libraries
    const data = JSON.stringify(key)
    return btoa(data) // Base64 encoding as placeholder
  }

  private async encryptData(data: string): Promise<string> {
    return btoa(data) // Placeholder encryption
  }

  private async decryptData(encryptedData: string): Promise<string> {
    return atob(encryptedData) // Placeholder decryption
  }

  private checkAccessPermission(key: StoredKey, partyId: string, operation: string): boolean {
    // Check if party owns the key or has admin access
    if (key.partyId === partyId || this.hasAdminAccess(partyId)) {
      return key.accessControls.allowedOperations.includes(operation)
    }
    return false
  }

  private hasAdminAccess(partyId: string): boolean {
    // Simplified admin check - in production, implement proper RBAC
    return partyId.includes('admin')
  }

  private isKeyExpired(key: StoredKey): boolean {
    if (!key.accessControls.expiryTime) {
      return false
    }
    return Date.now() > key.accessControls.expiryTime
  }

  private logAccess(keyId: string, operation: string, partyId: string): void {
    if (this.config.auditEnabled) {
      this.accessLog.push({
        keyId,
        operation,
        timestamp: Date.now(),
        partyId
      })

      // Keep only recent logs to prevent memory bloat
      if (this.accessLog.length > 10000) {
        this.accessLog = this.accessLog.slice(-5000)
      }
    }
  }

  private async checkStorageLimits(): Promise<void> {
    const currentSize = JSON.stringify([...this.encryptedStorage.values()]).length
    if (currentSize > this.config.maxStorageSize) {
      throw new DKGError('Storage limit exceeded', 'STORAGE_LIMIT_EXCEEDED')
    }
  }

  private getSessionParticipants(sessionId: string): string[] {
    return Array.from(new Set(
      Array.from(this.storage.values())
        .filter(key => key.sessionId === sessionId)
        .map(key => key.partyId)
    ))
  }

  private getSessionThreshold(sessionId: string): number {
    // Simplified - in production, store threshold separately
    return Math.ceil(this.getSessionParticipants(sessionId).length * 0.6)
  }

  private getSessionKeys(sessionId: string): StoredKey[] {
    return Array.from(this.storage.values()).filter(key => key.sessionId === sessionId)
  }

  private scheduleKeyDeletion(keyId: string): void {
    setTimeout(() => {
      if (this.storage.has(keyId)) {
        this.storage.delete(keyId)
        this.encryptedStorage.delete(keyId)
        console.log(`Scheduled deletion completed for key: ${keyId}`)
      }
    }, this.config.keyRetentionPeriod)
  }

  private getLastRotationTime(): number | undefined {
    const rotations = Array.from(this.rotationSessions.values())
      .filter(session => session.status === 'completed')
    
    if (rotations.length === 0) return undefined
    
    return Math.max(...rotations.map(session => 
      this.storage.get(session.sessionId)?.metadata.createdAt || 0
    ))
  }

  private startAutoRotation(): void {
    setInterval(() => {
      this.performAutoRotation()
    }, this.config.rotationInterval)
  }

  private performAutoRotation(): void {
    // Auto-rotation logic for keys that need rotation
    const now = Date.now()
    
    for (const [sessionId, keys] of this.groupKeysBySession()) {
      const oldestKey = keys.reduce((oldest, current) => 
        current.metadata.createdAt < oldest.metadata.createdAt ? current : oldest
      )

      if (now - oldestKey.metadata.createdAt > this.config.rotationInterval) {
        const newSessionId = `${sessionId}_rotated_${now}`
        this.rotateSessionKeys(sessionId, newSessionId).catch(error => {
          console.error(`Auto-rotation failed for session ${sessionId}:`, error)
        })
      }
    }
  }

  private groupKeysBySession(): Map<string, StoredKey[]> {
    const grouped = new Map<string, StoredKey[]>()
    
    for (const key of this.storage.values()) {
      if (!grouped.has(key.sessionId)) {
        grouped.set(key.sessionId, [])
      }
      grouped.get(key.sessionId)!.push(key)
    }
    
    return grouped
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.storage.clear()
    this.encryptedStorage.clear()
    this.accessLog = []
    this.rotationSessions.clear()
    console.log('Secure Key Storage cleanup completed')
  }
}