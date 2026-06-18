import { create as createIPFSClient } from 'ipfs-http-client'
import { redis } from '@/lib/redis'

interface IPFSUploadOptions {
  pin?: boolean
  timeout?: number
  progress?: (bytes: number) => void
}

interface IPFSUploadResult {
  success: boolean
  hash?: string
  size?: number
  error?: string
}

class IPFSClient {
  private client: any
  private isConnected: boolean = false

  constructor() {
    // Configure IPFS client
    const ipfsUrl = process.env.IPFS_API_URL || 'http://localhost:5001'
    
    try {
      this.client = createIPFSClient({
        url: ipfsUrl,
        timeout: 60000, // 60 seconds
      })
    } catch (error) {
      console.error('Failed to create IPFS client:', error)
    }
  }

  async connect(): Promise<boolean> {
    if (this.isConnected) return true

    try {
      // Test connection by getting IPFS version
      const version = await this.client.version()
      console.log('Connected to IPFS:', version)
      this.isConnected = true
      return true
    } catch (error) {
      console.error('Failed to connect to IPFS:', error)
      this.isConnected = false
      return false
    }
  }

  async uploadFile(
    fileBuffer: Buffer | Uint8Array,
    fileName: string,
    options: IPFSUploadOptions = {}
  ): Promise<IPFSUploadResult> {
    try {
      await this.ensureConnection()

      const uploadOptions: any = {
        pin: options.pin !== false, // Default to pinning
        timeout: options.timeout || 120000, // 2 minutes default
      }

      if (options.progress) {
        uploadOptions.progress = options.progress
      }

      // Upload to IPFS
      const result = await this.client.add({
        path: fileName,
        content: fileBuffer
      }, uploadOptions)

      const hash = result.cid.toString()
      
      // Store metadata in Redis for tracking
      await this.storeFileMetadata(hash, {
        fileName,
        size: fileBuffer.length,
        uploadedAt: new Date().toISOString(),
        pinned: uploadOptions.pin
      })

      return {
        success: true,
        hash,
        size: fileBuffer.length
      }

    } catch (error) {
      console.error('IPFS upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  async retrieveFile(hash: string): Promise<{
    success: boolean
    data?: Buffer
    metadata?: any
    error?: string
  }> {
    try {
      await this.ensureConnection()

      // Get file chunks from IPFS
      const chunks: Uint8Array[] = []
      
      for await (const chunk of this.client.cat(hash)) {
        chunks.push(chunk)
      }

      // Combine chunks into single buffer
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }

      // Get metadata from Redis
      const metadata = await this.getFileMetadata(hash)

      return {
        success: true,
        data: Buffer.from(result),
        metadata
      }

    } catch (error) {
      console.error('IPFS retrieval error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Retrieval failed'
      }
    }
  }

  async pinFile(hash: string): Promise<boolean> {
    try {
      await this.ensureConnection()
      await this.client.pin.add(hash)
      
      // Update metadata
      const metadata = await this.getFileMetadata(hash)
      if (metadata) {
        metadata.pinned = true
        await this.storeFileMetadata(hash, metadata)
      }
      
      return true
    } catch (error) {
      console.error('IPFS pin error:', error)
      return false
    }
  }

  async unpinFile(hash: string): Promise<boolean> {
    try {
      await this.ensureConnection()
      await this.client.pin.rm(hash)
      
      // Update metadata
      const metadata = await this.getFileMetadata(hash)
      if (metadata) {
        metadata.pinned = false
        await this.storeFileMetadata(hash, metadata)
      }
      
      return true
    } catch (error) {
      console.error('IPFS unpin error:', error)
      return false
    }
  }

  async getFileStats(hash: string): Promise<{
    success: boolean
    stats?: {
      hash: string
      size: number
      cumulativeSize: number
      type: string
      links: number
    }
    error?: string
  }> {
    try {
      await this.ensureConnection()
      
      const stats = await this.client.object.stat(hash)
      
      return {
        success: true,
        stats: {
          hash,
          size: stats.DataSize,
          cumulativeSize: stats.CumulativeSize,
          type: 'file',
          links: stats.NumLinks
        }
      }
    } catch (error) {
      console.error('IPFS stats error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stats retrieval failed'
      }
    }
  }

  async isFileAvailable(hash: string): Promise<boolean> {
    try {
      await this.ensureConnection()
      
      // Try to get basic info about the file
      const stats = await this.client.object.stat(hash)
      return !!stats
    } catch (error) {
      return false
    }
  }

  async listPinnedFiles(): Promise<string[]> {
    try {
      await this.ensureConnection()
      
      const pinnedFiles: string[] = []
      
      for await (const pin of this.client.pin.ls()) {
        pinnedFiles.push(pin.cid.toString())
      }
      
      return pinnedFiles
    } catch (error) {
      console.error('IPFS list pins error:', error)
      return []
    }
  }

  async getNetworkPeers(): Promise<{
    success: boolean
    peers?: Array<{ id: string; addr: string }>
    error?: string
  }> {
    try {
      await this.ensureConnection()
      
      const peers = await this.client.swarm.peers()
      
      return {
        success: true,
        peers: peers.map((peer: any) => ({
          id: peer.peer.toString(),
          addr: peer.addr.toString()
        }))
      }
    } catch (error) {
      console.error('IPFS peers error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get peers'
      }
    }
  }

  async getNodeInfo(): Promise<{
    success: boolean
    info?: {
      id: string
      version: string
      addresses: string[]
    }
    error?: string
  }> {
    try {
      await this.ensureConnection()
      
      const [id, version] = await Promise.all([
        this.client.id(),
        this.client.version()
      ])
      
      return {
        success: true,
        info: {
          id: id.id,
          version: version.version,
          addresses: id.addresses
        }
      }
    } catch (error) {
      console.error('IPFS node info error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get node info'
      }
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      const connected = await this.connect()
      if (!connected) {
        throw new Error('Unable to connect to IPFS')
      }
    }
  }

  private async storeFileMetadata(hash: string, metadata: any): Promise<void> {
    try {
      await redis.setex(`ipfs:meta:${hash}`, 30 * 24 * 60 * 60, JSON.stringify(metadata)) // 30 days
    } catch (error) {
      console.error('Failed to store IPFS metadata:', error)
    }
  }

  private async getFileMetadata(hash: string): Promise<any> {
    try {
      const metadataStr = await redis.get(`ipfs:meta:${hash}`)
      return metadataStr ? JSON.parse(metadataStr) : null
    } catch (error) {
      console.error('Failed to get IPFS metadata:', error)
      return null
    }
  }

  // Health check
  async healthCheck(): Promise<{
    connected: boolean
    peersCount?: number
    nodeId?: string
    error?: string
  }> {
    try {
      if (!this.isConnected) {
        await this.connect()
      }

      const [nodeInfo, peers] = await Promise.all([
        this.getNodeInfo(),
        this.getNetworkPeers()
      ])

      return {
        connected: this.isConnected,
        peersCount: peers.success ? peers.peers?.length : 0,
        nodeId: nodeInfo.success ? nodeInfo.info?.id : undefined
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      }
    }
  }

  // Cleanup and garbage collection
  async runGarbageCollection(): Promise<boolean> {
    try {
      await this.ensureConnection()
      await this.client.repo.gc()
      return true
    } catch (error) {
      console.error('IPFS garbage collection error:', error)
      return false
    }
  }

  getConnectionStatus(): {
    connected: boolean
    apiUrl: string
  } {
    return {
      connected: this.isConnected,
      apiUrl: process.env.IPFS_API_URL || 'http://localhost:5001'
    }
  }
}

// Create singleton instance
const ipfsClient = new IPFSClient()

export default ipfsClient
export { IPFSClient }