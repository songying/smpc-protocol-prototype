import algorithmDatabase, { Algorithm, AlgorithmAudit, AlgorithmVersion } from '../database/algorithm-schemas'
import algorithmEncryption from '../crypto/algorithm-encryption'

export interface CreateAlgorithmRequest {
  name: string
  description: string
  sourceCode: string
  computationType: 'third_party' | 'zk' | 'fhe'
  userAddress: string
}

export interface AlgorithmUploadResult {
  success: boolean
  algorithm?: Algorithm
  validationWarnings?: string[]
  error?: string
}

export interface AssignAuditRequest {
  algorithmId: string
  auditorAddress: string
  priority?: 'low' | 'medium' | 'high'
}

export interface AuditDecisionRequest {
  auditId: string
  decision: 'approved' | 'request_changes' | 'rejected'
  comments: string
  auditChecklist?: Record<string, boolean>
}

export interface UpdateAlgorithmRequest {
  algorithmId: string
  newSourceCode: string
  changesSummary: string
  userAddress: string
}

export class AlgorithmService {
  
  /**
   * Upload and encrypt a new algorithm
   */
  async uploadAlgorithm(request: CreateAlgorithmRequest): Promise<AlgorithmUploadResult> {
    try {
      // Validate algorithm source code
      const validation = await algorithmEncryption.validateAlgorithmCode(request.sourceCode)
      if (!validation.isValid) {
        return {
          success: false,
          error: `Algorithm validation failed: ${validation.errors.join(', ')}`
        }
      }
      
      // Encrypt the algorithm source code
      const encryptionResult = await algorithmEncryption.encryptAlgorithmCode(
        request.sourceCode,
        request.userAddress
      )
      
      if (!encryptionResult.success) {
        return {
          success: false,
          error: `Algorithm encryption failed: ${encryptionResult.error}`
        }
      }
      
      // Generate algorithm hash for integrity
      const algorithmHash = await algorithmEncryption.generateAlgorithmHash(request.sourceCode)
      
      // Create algorithm record
      const algorithm = await algorithmDatabase.createAlgorithm({
        name: request.name,
        description: request.description,
        encrypted_code: encryptionResult.encryptedCode!,
        computation_type: request.computationType,
        version: '1.0.0',
        status: 'pending',
        user_address: request.userAddress,
        encryption_key: encryptionResult.encryptionKey!,
        iv: encryptionResult.iv!,
        hmac: encryptionResult.hmac!
      })
      
      // Create initial version record
      await algorithmDatabase.createVersion({
        algorithm_id: algorithm.id,
        version_number: '1.0.0',
        encrypted_code: encryptionResult.encryptedCode!,
        changes_summary: 'Initial algorithm upload',
        encryption_key: encryptionResult.encryptionKey!,
        iv: encryptionResult.iv!,
        hmac: encryptionResult.hmac!
      })
      
      return {
        success: true,
        algorithm,
        validationWarnings: validation.warnings.length > 0 ? validation.warnings : undefined
      }
      
    } catch (error) {
      console.error('Algorithm upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Algorithm upload failed'
      }
    }
  }
  
  /**
   * Update an existing algorithm with a new version
   */
  async updateAlgorithm(request: UpdateAlgorithmRequest): Promise<AlgorithmUploadResult> {
    try {
      // Get existing algorithm
      const existingAlgorithm = await algorithmDatabase.getAlgorithm(request.algorithmId)
      if (!existingAlgorithm) {
        return {
          success: false,
          error: 'Algorithm not found'
        }
      }
      
      // Verify ownership
      if (existingAlgorithm.user_address !== request.userAddress) {
        return {
          success: false,
          error: 'Unauthorized: You can only update your own algorithms'
        }
      }
      
      // Validate new source code
      const validation = await algorithmEncryption.validateAlgorithmCode(request.newSourceCode)
      if (!validation.isValid) {
        return {
          success: false,
          error: `Algorithm validation failed: ${validation.errors.join(', ')}`
        }
      }
      
      // Encrypt the new source code
      const encryptionResult = await algorithmEncryption.encryptAlgorithmCode(
        request.newSourceCode,
        request.userAddress
      )
      
      if (!encryptionResult.success) {
        return {
          success: false,
          error: `Algorithm encryption failed: ${encryptionResult.error}`
        }
      }
      
      // Generate new version number
      const existingVersions = await algorithmDatabase.getVersionsByAlgorithm(request.algorithmId)
      const newVersionNumber = this.generateNextVersion(existingVersions.map(v => v.version_number))
      
      // Update algorithm with new encrypted code
      const updatedAlgorithm = await algorithmDatabase.updateAlgorithm(request.algorithmId, {
        encrypted_code: encryptionResult.encryptedCode!,
        version: newVersionNumber,
        status: 'pending', // Reset to pending for re-audit
        encryption_key: encryptionResult.encryptionKey!,
        iv: encryptionResult.iv!,
        hmac: encryptionResult.hmac!
      })
      
      if (!updatedAlgorithm) {
        return {
          success: false,
          error: 'Failed to update algorithm'
        }
      }
      
      // Create new version record
      await algorithmDatabase.createVersion({
        algorithm_id: request.algorithmId,
        version_number: newVersionNumber,
        encrypted_code: encryptionResult.encryptedCode!,
        changes_summary: request.changesSummary,
        encryption_key: encryptionResult.encryptionKey!,
        iv: encryptionResult.iv!,
        hmac: encryptionResult.hmac!
      })
      
      return {
        success: true,
        algorithm: updatedAlgorithm,
        validationWarnings: validation.warnings.length > 0 ? validation.warnings : undefined
      }
      
    } catch (error) {
      console.error('Algorithm update error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Algorithm update failed'
      }
    }
  }
  
  /**
   * Assign an algorithm for audit
   */
  async assignAudit(request: AssignAuditRequest): Promise<{
    success: boolean
    audit?: AlgorithmAudit
    error?: string
  }> {
    try {
      // Verify algorithm exists
      const algorithm = await algorithmDatabase.getAlgorithm(request.algorithmId)
      if (!algorithm) {
        return {
          success: false,
          error: 'Algorithm not found'
        }
      }
      
      // Check if there's already an active audit
      const existingAudits = await algorithmDatabase.getAuditsByAlgorithm(request.algorithmId)
      const activeAudit = existingAudits.find(audit => 
        ['assigned', 'in_review'].includes(audit.status)
      )
      
      if (activeAudit) {
        return {
          success: false,
          error: 'Algorithm already has an active audit'
        }
      }
      
      // Create audit assignment
      const audit = await algorithmDatabase.createAudit({
        algorithm_id: request.algorithmId,
        auditor_address: request.auditorAddress,
        status: 'assigned',
        comments: '',
        priority: request.priority || 'medium',
        audit_checklist: this.getDefaultAuditChecklist(algorithm.computation_type)
      })
      
      // Update algorithm status
      await algorithmDatabase.updateAlgorithm(request.algorithmId, {
        status: 'under_review'
      })
      
      return {
        success: true,
        audit
      }
      
    } catch (error) {
      console.error('Audit assignment error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Audit assignment failed'
      }
    }
  }
  
  /**
   * Submit audit decision
   */
  async submitAuditDecision(request: AuditDecisionRequest): Promise<{
    success: boolean
    audit?: AlgorithmAudit
    error?: string
  }> {
    try {
      // Get existing audit
      const existingAudit = await algorithmDatabase.getAudit(request.auditId)
      if (!existingAudit) {
        return {
          success: false,
          error: 'Audit not found'
        }
      }
      
      // Update audit with decision
      const updatedAudit = await algorithmDatabase.updateAudit(request.auditId, {
        status: request.decision,
        comments: request.comments,
        audit_checklist: request.auditChecklist || existingAudit.audit_checklist
      })
      
      if (!updatedAudit) {
        return {
          success: false,
          error: 'Failed to update audit'
        }
      }
      
      // Update algorithm status based on decision
      const newStatus = request.decision === 'approved' ? 'approved' :
                       request.decision === 'rejected' ? 'rejected' : 'pending'
      
      await algorithmDatabase.updateAlgorithm(existingAudit.algorithm_id, {
        status: newStatus
      })
      
      return {
        success: true,
        audit: updatedAudit
      }
      
    } catch (error) {
      console.error('Audit decision error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Audit decision submission failed'
      }
    }
  }
  
  /**
   * Get decrypted algorithm code for audit (auditor only)
   */
  async getAlgorithmForAudit(
    algorithmId: string,
    auditorAddress: string
  ): Promise<{
    success: boolean
    algorithm?: Algorithm
    decryptedCode?: string
    sandboxConfig?: any
    error?: string
  }> {
    try {
      // Get algorithm
      const algorithm = await algorithmDatabase.getAlgorithm(algorithmId)
      if (!algorithm) {
        return {
          success: false,
          error: 'Algorithm not found'
        }
      }
      
      // Verify auditor is assigned to this algorithm
      const audits = await algorithmDatabase.getAuditsByAlgorithm(algorithmId)
      const auditorAudit = audits.find(audit => 
        audit.auditor_address === auditorAddress && 
        ['assigned', 'in_review'].includes(audit.status)
      )
      
      if (!auditorAudit) {
        return {
          success: false,
          error: 'Unauthorized: You are not assigned as auditor for this algorithm'
        }
      }
      
      // Decrypt algorithm code
      const decryptionResult = await algorithmEncryption.decryptAlgorithmCode(
        algorithm.encrypted_code,
        algorithm.encryption_key!,
        algorithm.iv!,
        algorithm.hmac!,
        algorithm.user_address
      )
      
      if (!decryptionResult.success) {
        return {
          success: false,
          error: `Algorithm decryption failed: ${decryptionResult.error}`
        }
      }
      
      // Generate sandbox configuration
      const sandboxConfig = await algorithmEncryption.generateSandboxConfig(
        algorithmId,
        algorithm.computation_type
      )
      
      // Update audit status to in_review
      await algorithmDatabase.updateAudit(auditorAudit.id, {
        status: 'in_review'
      })
      
      return {
        success: true,
        algorithm,
        decryptedCode: decryptionResult.decryptedCode,
        sandboxConfig
      }
      
    } catch (error) {
      console.error('Algorithm audit retrieval error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve algorithm for audit'
      }
    }
  }
  
  /**
   * Get algorithms by user
   */
  async getUserAlgorithms(userAddress: string): Promise<Algorithm[]> {
    return await algorithmDatabase.getAlgorithmsByUser(userAddress)
  }
  
  /**
   * Get algorithms by status
   */
  async getAlgorithmsByStatus(status: Algorithm['status']): Promise<Algorithm[]> {
    return await algorithmDatabase.getAlgorithmsByStatus(status)
  }
  
  /**
   * Get pending audits for an auditor
   */
  async getAuditorPendingAudits(auditorAddress: string): Promise<AlgorithmAudit[]> {
    const audits = await algorithmDatabase.getAuditsByAuditor(auditorAddress)
    return audits.filter(audit => ['assigned', 'in_review'].includes(audit.status))
  }
  
  /**
   * Get algorithm versions
   */
  async getAlgorithmVersions(algorithmId: string): Promise<AlgorithmVersion[]> {
    return await algorithmDatabase.getVersionsByAlgorithm(algorithmId)
  }
  
  /**
   * Get algorithm statistics
   */
  async getAlgorithmStatistics(): Promise<Record<string, any>> {
    return await algorithmDatabase.getAlgorithmStats()
  }
  
  /**
   * Generate next version number (semantic versioning)
   */
  private generateNextVersion(existingVersions: string[]): string {
    if (existingVersions.length === 0) {
      return '1.0.0'
    }
    
    // Find the highest version
    const versions = existingVersions
      .map(v => v.split('.').map(n => parseInt(n)))
      .sort((a, b) => {
        for (let i = 0; i < 3; i++) {
          if (a[i] !== b[i]) return b[i] - a[i]
        }
        return 0
      })
    
    const [major, minor, patch] = versions[0]
    return `${major}.${minor}.${patch + 1}`
  }
  
  /**
   * Get default audit checklist based on computation type
   */
  private getDefaultAuditChecklist(computationType: 'third_party' | 'zk' | 'fhe'): Record<string, boolean> {
    const baseChecklist = {
      'code_quality': false,
      'security_review': false,
      'performance_check': false,
      'documentation_review': false,
      'test_coverage': false,
      'error_handling': false
    }
    
    const typeSpecificChecklists = {
      third_party: {
        ...baseChecklist,
        'network_security': false,
        'data_validation': false,
        'api_compliance': false
      },
      zk: {
        ...baseChecklist,
        'circuit_correctness': false,
        'proof_verification': false,
        'privacy_preservation': false,
        'constraint_system': false
      },
      fhe: {
        ...baseChecklist,
        'encryption_correctness': false,
        'homomorphic_operations': false,
        'key_management': false,
        'computation_efficiency': false
      }
    }
    
    return typeSpecificChecklists[computationType]
  }
}

// Create singleton instance
const algorithmService = new AlgorithmService()

export default algorithmService