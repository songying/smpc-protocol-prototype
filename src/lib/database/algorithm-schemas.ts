import redisClient from './redis-client'
import { v4 as uuidv4 } from 'uuid'

export interface Algorithm {
  id: string
  user_address: string
  name: string
  description: string
  encrypted_code: string
  computation_type: 'third_party' | 'zk' | 'fhe'
  version: string
  status: 'pending' | 'approved' | 'rejected' | 'under_review'
  created_at: string
  updated_at: string
  encryption_key?: string
  iv?: string
  hmac?: string
}

export interface AlgorithmAudit {
  id: string
  algorithm_id: string
  auditor_address: string
  status: 'assigned' | 'in_review' | 'approved' | 'request_changes' | 'rejected'
  comments: string
  assigned_at: string
  completed_at?: string
  priority: 'low' | 'medium' | 'high'
  audit_checklist?: Record<string, boolean>
}

export interface AlgorithmVersion {
  id: string
  algorithm_id: string
  version_number: string
  encrypted_code: string
  changes_summary: string
  created_at: string
  encryption_key?: string
  iv?: string
  hmac?: string
}

export interface SampleData {
  id: string
  owner_address: string
  data_structure: string
  health_data: string
  created_at: string
  is_public_sample: boolean
  data_hash?: string
}

export interface PublicSample {
  id: string
  sample_data_id: string
  structure_documentation: string
  field_descriptions: Record<string, any>
  last_updated: string
}

export class AlgorithmDatabase {
  private static readonly ALGORITHM_PREFIX = 'algorithm:'
  private static readonly AUDIT_PREFIX = 'audit:'
  private static readonly VERSION_PREFIX = 'version:'
  private static readonly SAMPLE_PREFIX = 'sample:'
  private static readonly PUBLIC_SAMPLE_PREFIX = 'public_sample:'
  private static readonly INDEX_PREFIX = 'index:'

  // Algorithm CRUD operations
  async createAlgorithm(algorithm: Omit<Algorithm, 'id' | 'created_at' | 'updated_at'>): Promise<Algorithm> {
    const id = uuidv4()
    const now = new Date().toISOString()
    
    const fullAlgorithm: Algorithm = {
      ...algorithm,
      id,
      created_at: now,
      updated_at: now
    }

    const key = `${AlgorithmDatabase.ALGORITHM_PREFIX}${id}`
    await redisClient.set(key, JSON.stringify(fullAlgorithm))
    
    // Create indexes
    await this.updateAlgorithmIndexes(fullAlgorithm)
    
    return fullAlgorithm
  }

  async getAlgorithm(id: string): Promise<Algorithm | null> {
    const key = `${AlgorithmDatabase.ALGORITHM_PREFIX}${id}`
    const data = await redisClient.get(key)
    return data ? JSON.parse(data) : null
  }

  async updateAlgorithm(id: string, updates: Partial<Algorithm>): Promise<Algorithm | null> {
    const existing = await this.getAlgorithm(id)
    if (!existing) return null

    const updated: Algorithm = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    }

    const key = `${AlgorithmDatabase.ALGORITHM_PREFIX}${id}`
    await redisClient.set(key, JSON.stringify(updated))
    
    // Update indexes
    await this.updateAlgorithmIndexes(updated)
    
    return updated
  }

  async deleteAlgorithm(id: string): Promise<boolean> {
    const algorithm = await this.getAlgorithm(id)
    if (!algorithm) return false

    // Remove from indexes
    await this.removeFromIndexes(algorithm)
    
    // Delete main record
    const key = `${AlgorithmDatabase.ALGORITHM_PREFIX}${id}`
    const deleted = await redisClient.del(key)
    
    return deleted === 1
  }

  async getAlgorithmsByUser(userAddress: string): Promise<Algorithm[]> {
    const indexKey = `${AlgorithmDatabase.INDEX_PREFIX}user:${userAddress}`
    const algorithmIds = await redisClient.smembers(indexKey)
    
    const algorithms: Algorithm[] = []
    for (const id of algorithmIds) {
      const algorithm = await this.getAlgorithm(id)
      if (algorithm) algorithms.push(algorithm)
    }
    
    return algorithms.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  async getAlgorithmsByStatus(status: Algorithm['status']): Promise<Algorithm[]> {
    const indexKey = `${AlgorithmDatabase.INDEX_PREFIX}status:${status}`
    const algorithmIds = await redisClient.smembers(indexKey)
    
    const algorithms: Algorithm[] = []
    for (const id of algorithmIds) {
      const algorithm = await this.getAlgorithm(id)
      if (algorithm) algorithms.push(algorithm)
    }
    
    return algorithms.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  async getAlgorithmsByComputationType(type: Algorithm['computation_type']): Promise<Algorithm[]> {
    const indexKey = `${AlgorithmDatabase.INDEX_PREFIX}computation_type:${type}`
    const algorithmIds = await redisClient.smembers(indexKey)
    
    const algorithms: Algorithm[] = []
    for (const id of algorithmIds) {
      const algorithm = await this.getAlgorithm(id)
      if (algorithm) algorithms.push(algorithm)
    }
    
    return algorithms.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  // Algorithm Audit operations
  async createAudit(audit: Omit<AlgorithmAudit, 'id' | 'assigned_at'>): Promise<AlgorithmAudit> {
    const id = uuidv4()
    const fullAudit: AlgorithmAudit = {
      ...audit,
      id,
      assigned_at: new Date().toISOString()
    }

    const key = `${AlgorithmDatabase.AUDIT_PREFIX}${id}`
    await redisClient.set(key, JSON.stringify(fullAudit))
    
    // Create indexes for audits
    await this.updateAuditIndexes(fullAudit)
    
    return fullAudit
  }

  async getAudit(id: string): Promise<AlgorithmAudit | null> {
    const key = `${AlgorithmDatabase.AUDIT_PREFIX}${id}`
    const data = await redisClient.get(key)
    return data ? JSON.parse(data) : null
  }

  async updateAudit(id: string, updates: Partial<AlgorithmAudit>): Promise<AlgorithmAudit | null> {
    const existing = await this.getAudit(id)
    if (!existing) return null

    const updated: AlgorithmAudit = {
      ...existing,
      ...updates,
      completed_at: updates.status && ['approved', 'request_changes', 'rejected'].includes(updates.status) 
        ? new Date().toISOString() 
        : existing.completed_at
    }

    const key = `${AlgorithmDatabase.AUDIT_PREFIX}${id}`
    await redisClient.set(key, JSON.stringify(updated))
    
    await this.updateAuditIndexes(updated)
    
    return updated
  }

  async getAuditsByAlgorithm(algorithmId: string): Promise<AlgorithmAudit[]> {
    const indexKey = `${AlgorithmDatabase.INDEX_PREFIX}audit_algorithm:${algorithmId}`
    const auditIds = await redisClient.smembers(indexKey)
    
    const audits: AlgorithmAudit[] = []
    for (const id of auditIds) {
      const audit = await this.getAudit(id)
      if (audit) audits.push(audit)
    }
    
    return audits.sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime())
  }

  async getAuditsByAuditor(auditorAddress: string): Promise<AlgorithmAudit[]> {
    const indexKey = `${AlgorithmDatabase.INDEX_PREFIX}audit_auditor:${auditorAddress}`
    const auditIds = await redisClient.smembers(indexKey)
    
    const audits: AlgorithmAudit[] = []
    for (const id of auditIds) {
      const audit = await this.getAudit(id)
      if (audit) audits.push(audit)
    }
    
    return audits.sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime())
  }

  async getPendingAudits(): Promise<AlgorithmAudit[]> {
    const indexKey = `${AlgorithmDatabase.INDEX_PREFIX}audit_status:assigned`
    const auditIds = await redisClient.smembers(indexKey)
    
    const audits: AlgorithmAudit[] = []
    for (const id of auditIds) {
      const audit = await this.getAudit(id)
      if (audit) audits.push(audit)
    }
    
    return audits.sort((a, b) => {
      // Sort by priority (high, medium, low) then by assigned date
      const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime()
    })
  }

  // Algorithm Version operations
  async createVersion(version: Omit<AlgorithmVersion, 'id' | 'created_at'>): Promise<AlgorithmVersion> {
    const id = uuidv4()
    const fullVersion: AlgorithmVersion = {
      ...version,
      id,
      created_at: new Date().toISOString()
    }

    const key = `${AlgorithmDatabase.VERSION_PREFIX}${id}`
    await redisClient.set(key, JSON.stringify(fullVersion))
    
    // Create index for algorithm versions
    const indexKey = `${AlgorithmDatabase.INDEX_PREFIX}version_algorithm:${version.algorithm_id}`
    await redisClient.sadd(indexKey, id)
    
    return fullVersion
  }

  async getVersion(id: string): Promise<AlgorithmVersion | null> {
    const key = `${AlgorithmDatabase.VERSION_PREFIX}${id}`
    const data = await redisClient.get(key)
    return data ? JSON.parse(data) : null
  }

  async getVersionsByAlgorithm(algorithmId: string): Promise<AlgorithmVersion[]> {
    const indexKey = `${AlgorithmDatabase.INDEX_PREFIX}version_algorithm:${algorithmId}`
    const versionIds = await redisClient.smembers(indexKey)
    
    const versions: AlgorithmVersion[] = []
    for (const id of versionIds) {
      const version = await this.getVersion(id)
      if (version) versions.push(version)
    }
    
    return versions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  // Sample Data operations
  async createSampleData(data: Omit<SampleData, 'id' | 'created_at'>): Promise<SampleData> {
    const id = uuidv4()
    const fullData: SampleData = {
      ...data,
      id,
      created_at: new Date().toISOString()
    }

    const key = `${AlgorithmDatabase.SAMPLE_PREFIX}${id}`
    await redisClient.set(key, JSON.stringify(fullData))
    
    // Create indexes
    const ownerIndexKey = `${AlgorithmDatabase.INDEX_PREFIX}sample_owner:${data.owner_address}`
    await redisClient.sadd(ownerIndexKey, id)
    
    if (data.is_public_sample) {
      const publicIndexKey = `${AlgorithmDatabase.INDEX_PREFIX}sample_public`
      await redisClient.sadd(publicIndexKey, id)
    }
    
    return fullData
  }

  async getSampleData(id: string): Promise<SampleData | null> {
    const key = `${AlgorithmDatabase.SAMPLE_PREFIX}${id}`
    const data = await redisClient.get(key)
    return data ? JSON.parse(data) : null
  }

  async getSampleDataByOwner(ownerAddress: string): Promise<SampleData[]> {
    const indexKey = `${AlgorithmDatabase.INDEX_PREFIX}sample_owner:${ownerAddress}`
    const dataIds = await redisClient.smembers(indexKey)
    
    const samples: SampleData[] = []
    for (const id of dataIds) {
      const sample = await this.getSampleData(id)
      if (sample) samples.push(sample)
    }
    
    return samples.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  async getPublicSamples(): Promise<SampleData[]> {
    const indexKey = `${AlgorithmDatabase.INDEX_PREFIX}sample_public`
    const dataIds = await redisClient.smembers(indexKey)
    
    const samples: SampleData[] = []
    for (const id of dataIds) {
      const sample = await this.getSampleData(id)
      if (sample) samples.push(sample)
    }
    
    return samples.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  // Public Sample operations
  async createPublicSample(sample: Omit<PublicSample, 'id' | 'last_updated'>): Promise<PublicSample> {
    const id = uuidv4()
    const fullSample: PublicSample = {
      ...sample,
      id,
      last_updated: new Date().toISOString()
    }

    const key = `${AlgorithmDatabase.PUBLIC_SAMPLE_PREFIX}${id}`
    await redisClient.set(key, JSON.stringify(fullSample))
    
    return fullSample
  }

  async getPublicSample(id: string): Promise<PublicSample | null> {
    const key = `${AlgorithmDatabase.PUBLIC_SAMPLE_PREFIX}${id}`
    const data = await redisClient.get(key)
    return data ? JSON.parse(data) : null
  }

  async getPublicSampleByDataId(sampleDataId: string): Promise<PublicSample | null> {
    const pattern = `${AlgorithmDatabase.PUBLIC_SAMPLE_PREFIX}*`
    const keys = await redisClient.keys(pattern)
    
    for (const key of keys) {
      const data = await redisClient.get(key)
      if (data) {
        const sample: PublicSample = JSON.parse(data)
        if (sample.sample_data_id === sampleDataId) {
          return sample
        }
      }
    }
    
    return null
  }

  // Index management helpers
  private async updateAlgorithmIndexes(algorithm: Algorithm): Promise<void> {
    // Index by user
    const userIndexKey = `${AlgorithmDatabase.INDEX_PREFIX}user:${algorithm.user_address}`
    await redisClient.sadd(userIndexKey, algorithm.id)
    
    // Index by status
    const statusIndexKey = `${AlgorithmDatabase.INDEX_PREFIX}status:${algorithm.status}`
    await redisClient.sadd(statusIndexKey, algorithm.id)
    
    // Index by computation type
    const typeIndexKey = `${AlgorithmDatabase.INDEX_PREFIX}computation_type:${algorithm.computation_type}`
    await redisClient.sadd(typeIndexKey, algorithm.id)
  }

  private async updateAuditIndexes(audit: AlgorithmAudit): Promise<void> {
    // Index by algorithm
    const algorithmIndexKey = `${AlgorithmDatabase.INDEX_PREFIX}audit_algorithm:${audit.algorithm_id}`
    await redisClient.sadd(algorithmIndexKey, audit.id)
    
    // Index by auditor
    const auditorIndexKey = `${AlgorithmDatabase.INDEX_PREFIX}audit_auditor:${audit.auditor_address}`
    await redisClient.sadd(auditorIndexKey, audit.id)
    
    // Index by status
    const statusIndexKey = `${AlgorithmDatabase.INDEX_PREFIX}audit_status:${audit.status}`
    await redisClient.sadd(statusIndexKey, audit.id)
  }

  private async removeFromIndexes(algorithm: Algorithm): Promise<void> {
    // Remove from all relevant indexes
    const indexes = [
      `${AlgorithmDatabase.INDEX_PREFIX}user:${algorithm.user_address}`,
      `${AlgorithmDatabase.INDEX_PREFIX}status:${algorithm.status}`,
      `${AlgorithmDatabase.INDEX_PREFIX}computation_type:${algorithm.computation_type}`
    ]
    
    for (const indexKey of indexes) {
      await redisClient.srem(indexKey, algorithm.id)
    }
  }

  // Statistics and analytics
  async getAlgorithmStats(): Promise<Record<string, any>> {
    const totalAlgorithms = await this.getTotalCount('algorithm:')
    const totalAudits = await this.getTotalCount('audit:')
    const totalVersions = await this.getTotalCount('version:')
    const totalSamples = await this.getTotalCount('sample:')
    
    // Get counts by status
    const pendingCount = (await this.getAlgorithmsByStatus('pending')).length
    const approvedCount = (await this.getAlgorithmsByStatus('approved')).length
    const rejectedCount = (await this.getAlgorithmsByStatus('rejected')).length
    
    // Get counts by computation type
    const thirdPartyCount = (await this.getAlgorithmsByComputationType('third_party')).length
    const zkCount = (await this.getAlgorithmsByComputationType('zk')).length
    const fheCount = (await this.getAlgorithmsByComputationType('fhe')).length
    
    return {
      total: {
        algorithms: totalAlgorithms,
        audits: totalAudits,
        versions: totalVersions,
        samples: totalSamples
      },
      algorithms_by_status: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        under_review: totalAlgorithms - pendingCount - approvedCount - rejectedCount
      },
      algorithms_by_type: {
        third_party: thirdPartyCount,
        zk: zkCount,
        fhe: fheCount
      }
    }
  }

  private async getTotalCount(prefix: string): Promise<number> {
    const pattern = `${prefix}*`
    const keys = await redisClient.keys(pattern)
    return keys.length
  }
}

// Create singleton instance
const algorithmDatabase = new AlgorithmDatabase()

export default algorithmDatabase