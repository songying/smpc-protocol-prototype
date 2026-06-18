import redisClient from './database/redis-client'

// Production Redis client with comprehensive error handling and connection pooling
export const redis = redisClient

// Legacy interface for backward compatibility
export class RedisManager {
  async ensureConnection() {
    try {
      await redis.connect()
      return true
    } catch (error) {
      console.error('Redis connection failed:', error)
      return false
    }
  }

  async createSession(session: any) {
    try {
      await redis.setex(`session:${session.id}`, 7 * 24 * 60 * 60, JSON.stringify(session))
      return true
    } catch (error) {
      console.error('Failed to create session:', error)
      return false
    }
  }

  async getSession(sessionId: string) {
    try {
      const sessionData = await redis.get(`session:${sessionId}`)
      return sessionData ? JSON.parse(sessionData) : null
    } catch (error) {
      console.error('Failed to get session:', error)
      return null
    }
  }

  async updateSession(sessionId: string, updates: any) {
    try {
      const existingSession = await this.getSession(sessionId)
      if (!existingSession) return false
      
      const updatedSession = { ...existingSession, ...updates }
      await redis.setex(`session:${sessionId}`, 7 * 24 * 60 * 60, JSON.stringify(updatedSession))
      return true
    } catch (error) {
      console.error('Failed to update session:', error)
      return false
    }
  }

  async deleteSession(sessionId: string) {
    try {
      await redis.del(`session:${sessionId}`)
      return true
    } catch (error) {
      console.error('Failed to delete session:', error)
      return false
    }
  }

  async cacheUserProfile(userId: string, profile: any) {
    try {
      await redis.setex(`user:${userId}`, 24 * 60 * 60, JSON.stringify(profile)) // 24 hours
      return true
    } catch (error) {
      console.error('Failed to cache user profile:', error)
      return false
    }
  }

  async getCachedUserProfile(userId: string) {
    try {
      const profileData = await redis.get(`user:${userId}`)
      return profileData ? JSON.parse(profileData) : null
    } catch (error) {
      console.error('Failed to get cached user profile:', error)
      return null
    }
  }

  async createNonce(walletAddress: string) {
    try {
      const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      await redis.setex(`nonce:${walletAddress.toLowerCase()}`, 5 * 60, nonce) // 5 minutes
      return nonce
    } catch (error) {
      console.error('Failed to create nonce:', error)
      throw error
    }
  }

  async verifyNonce(walletAddress: string, nonce: string) {
    try {
      const storedNonce = await redis.get(`nonce:${walletAddress.toLowerCase()}`)
      const isValid = storedNonce === nonce
      
      if (isValid) {
        await redis.del(`nonce:${walletAddress.toLowerCase()}`) // Delete used nonce
      }
      
      return isValid
    } catch (error) {
      console.error('Failed to verify nonce:', error)
      return false
    }
  }

  async set(key: string, value: any, expireInSeconds?: number) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
      if (expireInSeconds) {
        await redis.setex(key, expireInSeconds, stringValue)
      } else {
        await redis.set(key, stringValue)
      }
      return true
    } catch (error) {
      console.error(`Failed to set key ${key}:`, error)
      return false
    }
  }

  async get(key: string) {
    try {
      const value = await redis.get(key)
      if (!value) return null
      
      try {
        return JSON.parse(value)
      } catch {
        return value // Return as string if not JSON
      }
    } catch (error) {
      console.error(`Failed to get key ${key}:`, error)
      return null
    }
  }

  async del(key: string) {
    try {
      await redis.del(key)
      return true
    } catch (error) {
      console.error(`Failed to delete key ${key}:`, error)
      return false
    }
  }

  async exists(key: string) {
    try {
      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      console.error(`Failed to check existence of key ${key}:`, error)
      return false
    }
  }

  async healthCheck() {
    try {
      const start = Date.now()
      await redis.ping()
      const latency = Date.now() - start
      
      return { 
        connected: redis.isHealthy(), 
        latency,
        connectionInfo: redis.getConnectionInfo()
      }
    } catch (error) {
      console.error('Redis health check failed:', error)
      return { connected: false, latency: -1, error: error.message }
    }
  }
}