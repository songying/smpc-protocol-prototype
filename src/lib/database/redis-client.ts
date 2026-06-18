import Redis from 'ioredis'

class RedisClient {
  private client: Redis
  private isConnected: boolean = false
  private connectionAttempts: number = 0
  private maxRetries: number = 5
  private retryDelay: number = 1000 // 1 second

  constructor() {
    // Use REDIS_URL if available, otherwise fall back to individual config
    const redisUrl = process.env.REDIS_URL
    const redisConfig = redisUrl ? redisUrl : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    }

    if (typeof redisConfig === 'string') {
      // When using URL string, pass it as first parameter
      this.client = new Redis(redisConfig, {
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,

        // Connection pool settings
        connectTimeout: 10000,
        commandTimeout: 5000,

        // Retry strategy
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000)
          return delay
        },

        // Reconnect on error
        reconnectOnError: (err) => {
          const targetError = 'READONLY'
          return err.message.includes(targetError)
        }
      })
    } else {
      // When using config object
      this.client = new Redis(Object.assign(redisConfig, {
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,

        // Connection pool settings
        connectTimeout: 10000,
        commandTimeout: 5000,

        // Retry strategy
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000)
          return delay
        },

        // Reconnect on error
        reconnectOnError: (err) => {
          const targetError = 'READONLY'
          return err.message.includes(targetError)
        }
      }))
    }

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('Redis client connected')
      this.isConnected = true
      this.connectionAttempts = 0
    })

    this.client.on('ready', () => {
      console.log('Redis client ready')
    })

    this.client.on('error', (err) => {
      console.error('Redis client error:', err)
      this.isConnected = false
    })

    this.client.on('close', () => {
      console.log('Redis connection closed')
      this.isConnected = false
    })

    this.client.on('reconnecting', () => {
      console.log('Redis client reconnecting...')
    })
  }

  async connect(): Promise<void> {
    if (this.isConnected) return

    try {
      await this.client.connect()
      this.isConnected = true
    } catch (error) {
      this.connectionAttempts++
      console.error(`Redis connection attempt ${this.connectionAttempts} failed:`, error)
      
      if (this.connectionAttempts < this.maxRetries) {
        console.log(`Retrying in ${this.retryDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, this.retryDelay))
        this.retryDelay *= 2 // Exponential backoff
        return this.connect()
      } else {
        throw new Error(`Failed to connect to Redis after ${this.maxRetries} attempts`)
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit()
      this.isConnected = false
    }
  }

  // Ensure connection before operations
  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect()
    }
  }

  // Basic operations with error handling
  async get(key: string): Promise<string | null> {
    try {
      await this.ensureConnection()
      return await this.client.get(key)
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error)
      throw new Error(`Failed to get key: ${key}`)
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    try {
      await this.ensureConnection()
      if (ttl) {
        return await this.client.setex(key, ttl, value)
      }
      return await this.client.set(key, value)
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error)
      throw new Error(`Failed to set key: ${key}`)
    }
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    try {
      await this.ensureConnection()
      return await this.client.setex(key, seconds, value)
    } catch (error) {
      console.error(`Redis SETEX error for key ${key}:`, error)
      throw new Error(`Failed to setex key: ${key}`)
    }
  }

  async del(key: string): Promise<number> {
    try {
      await this.ensureConnection()
      return await this.client.del(key)
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error)
      throw new Error(`Failed to delete key: ${key}`)
    }
  }

  async exists(key: string): Promise<number> {
    try {
      await this.ensureConnection()
      return await this.client.exists(key)
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error)
      throw new Error(`Failed to check existence of key: ${key}`)
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      await this.ensureConnection()
      return await this.client.keys(pattern)
    } catch (error) {
      console.error(`Redis KEYS error for pattern ${pattern}:`, error)
      throw new Error(`Failed to get keys for pattern: ${pattern}`)
    }
  }

  async incr(key: string): Promise<number> {
    try {
      await this.ensureConnection()
      return await this.client.incr(key)
    } catch (error) {
      console.error(`Redis INCR error for key ${key}:`, error)
      throw new Error(`Failed to increment key: ${key}`)
    }
  }

  async decr(key: string): Promise<number> {
    try {
      await this.ensureConnection()
      return await this.client.decr(key)
    } catch (error) {
      console.error(`Redis DECR error for key ${key}:`, error)
      throw new Error(`Failed to decrement key: ${key}`)
    }
  }

  async expire(key: string, seconds: number): Promise<number> {
    try {
      await this.ensureConnection()
      return await this.client.expire(key, seconds)
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error)
      throw new Error(`Failed to set expiration for key: ${key}`)
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      await this.ensureConnection()
      return await this.client.ttl(key)
    } catch (error) {
      console.error(`Redis TTL error for key ${key}:`, error)
      throw new Error(`Failed to get TTL for key: ${key}`)
    }
  }

  // Hash operations
  async hget(key: string, field: string): Promise<string | null> {
    try {
      await this.ensureConnection()
      return await this.client.hget(key, field)
    } catch (error) {
      console.error(`Redis HGET error for key ${key}, field ${field}:`, error)
      throw new Error(`Failed to get hash field: ${key}.${field}`)
    }
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    try {
      await this.ensureConnection()
      return await this.client.hset(key, field, value)
    } catch (error) {
      console.error(`Redis HSET error for key ${key}, field ${field}:`, error)
      throw new Error(`Failed to set hash field: ${key}.${field}`)
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      await this.ensureConnection()
      return await this.client.hgetall(key)
    } catch (error) {
      console.error(`Redis HGETALL error for key ${key}:`, error)
      throw new Error(`Failed to get all hash fields: ${key}`)
    }
  }

  async hdel(key: string, field: string): Promise<number> {
    try {
      await this.ensureConnection()
      return await this.client.hdel(key, field)
    } catch (error) {
      console.error(`Redis HDEL error for key ${key}, field ${field}:`, error)
      throw new Error(`Failed to delete hash field: ${key}.${field}`)
    }
  }

  // List operations
  async lpush(key: string, value: string): Promise<number> {
    try {
      await this.ensureConnection()
      return await this.client.lpush(key, value)
    } catch (error) {
      console.error(`Redis LPUSH error for key ${key}:`, error)
      throw new Error(`Failed to left push to list: ${key}`)
    }
  }

  async rpush(key: string, value: string): Promise<number> {
    try {
      await this.ensureConnection()
      return await this.client.rpush(key, value)
    } catch (error) {
      console.error(`Redis RPUSH error for key ${key}:`, error)
      throw new Error(`Failed to right push to list: ${key}`)
    }
  }

  async lpop(key: string): Promise<string | null> {
    try {
      await this.ensureConnection()
      return await this.client.lpop(key)
    } catch (error) {
      console.error(`Redis LPOP error for key ${key}:`, error)
      throw new Error(`Failed to left pop from list: ${key}`)
    }
  }

  async rpop(key: string): Promise<string | null> {
    try {
      await this.ensureConnection()
      return await this.client.rpop(key)
    } catch (error) {
      console.error(`Redis RPOP error for key ${key}:`, error)
      throw new Error(`Failed to right pop from list: ${key}`)
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      await this.ensureConnection()
      return await this.client.lrange(key, start, stop)
    } catch (error) {
      console.error(`Redis LRANGE error for key ${key}:`, error)
      throw new Error(`Failed to get range from list: ${key}`)
    }
  }

  async ltrim(key: string, start: number, stop: number): Promise<'OK'> {
    try {
      await this.ensureConnection()
      return await this.client.ltrim(key, start, stop)
    } catch (error) {
      console.error(`Redis LTRIM error for key ${key}:`, error)
      throw new Error(`Failed to trim list: ${key}`)
    }
  }

  // Set operations
  async sadd(key: string, member: string): Promise<number> {
    try {
      await this.ensureConnection()
      return await this.client.sadd(key, member)
    } catch (error) {
      console.error(`Redis SADD error for key ${key}:`, error)
      throw new Error(`Failed to add to set: ${key}`)
    }
  }

  async srem(key: string, member: string): Promise<number> {
    try {
      await this.ensureConnection()
      return await this.client.srem(key, member)
    } catch (error) {
      console.error(`Redis SREM error for key ${key}:`, error)
      throw new Error(`Failed to remove from set: ${key}`)
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      await this.ensureConnection()
      return await this.client.smembers(key)
    } catch (error) {
      console.error(`Redis SMEMBERS error for key ${key}:`, error)
      throw new Error(`Failed to get set members: ${key}`)
    }
  }

  async sismember(key: string, member: string): Promise<number> {
    try {
      await this.ensureConnection()
      return await this.client.sismember(key, member)
    } catch (error) {
      console.error(`Redis SISMEMBER error for key ${key}:`, error)
      throw new Error(`Failed to check set membership: ${key}`)
    }
  }

  // Advanced operations
  async multi(): Promise<any> {
    try {
      await this.ensureConnection()
      return this.client.multi()
    } catch (error) {
      console.error('Redis MULTI error:', error)
      throw new Error('Failed to create transaction')
    }
  }

  async eval(script: string, numKeys: number, ...args: string[]): Promise<any> {
    try {
      await this.ensureConnection()
      return await this.client.eval(script, numKeys, ...args)
    } catch (error) {
      console.error('Redis EVAL error:', error)
      throw new Error('Failed to execute Lua script')
    }
  }

  // Health check
  async ping(): Promise<string> {
    try {
      await this.ensureConnection()
      return await this.client.ping()
    } catch (error) {
      console.error('Redis PING error:', error)
      throw new Error('Redis health check failed')
    }
  }

  // Connection status
  isHealthy(): boolean {
    return this.isConnected && this.client.status === 'ready'
  }

  getConnectionInfo(): object {
    return {
      status: this.client.status,
      isConnected: this.isConnected,
      connectionAttempts: this.connectionAttempts,
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || '6379',
      db: process.env.REDIS_DB || '0'
    }
  }
}

// Create singleton instance
const redisClient = new RedisClient()

export default redisClient
export { RedisClient }