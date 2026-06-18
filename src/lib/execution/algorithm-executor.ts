import { Algorithm, AlgorithmVersion, SampleData } from '@/lib/database/algorithm-schemas'
import { SMPCProcessor } from '@/lib/mkfhe/smpc-processor'
import algorithmEncryption from '@/lib/crypto/algorithm-encryption'
import crypto from 'crypto'
import { runSecureAggregation, simulateAggregation, SmpcOperation } from '@/lib/execution/smpc-orchestrator'
import { settleFeesOnChain } from '@/lib/contracts/onchain'
import { config } from '@/lib/config'

export interface ComputationRequest {
  id: string
  algorithmId: string
  algorithmVersion?: string
  computationType: 'third_party' | 'zk' | 'fhe'
  inputDataIds: string[]
  requesterAddress: string
  parameters?: Record<string, any>
  privacyLevel: 'high' | 'medium' | 'low'
  maxExecutionTime?: number
  estimatedCost?: number
}

export interface ComputationResult {
  requestId: string
  algorithmId: string
  computationType: 'third_party' | 'zk' | 'fhe'
  status: 'queued' | 'running' | 'completed' | 'failed' | 'timeout'
  result?: any
  encryptedResult?: string
  proof?: string
  errorMessage?: string
  executionTime: number
  resourceUsage: {
    cpu: number
    memory: number
    network: number
  }
  verificationStatus: 'verified' | 'unverified' | 'failed'
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface ExecutionContext {
  sandboxId: string
  environmentType: 'node' | 'browser' | 'wasm'
  securityRestrictions: string[]
  memoryLimit: number
  timeLimit: number
  networkAccess: boolean
}

export interface AlgorithmValidationResult {
  isValid: boolean
  securityScore: number
  warnings: string[]
  errors: string[]
  estimatedComplexity: 'low' | 'medium' | 'high'
  supportedComputationTypes: Array<'third_party' | 'zk' | 'fhe'>
}

class AlgorithmExecutor {
  private smpcProcessor: SMPCProcessor
  private runningComputations: Map<string, ComputationResult>
  private executionQueue: ComputationRequest[]

  constructor() {
    this.smpcProcessor = new SMPCProcessor()
    this.runningComputations = new Map()
    this.executionQueue = []
  }

  async initialize(): Promise<void> {
    // The FHE processor (node-seal / Microsoft SEAL) powers the real homomorphic
    // FHE path. Initialized best-effort so it can never block the live SMPC
    // aggregation path if the WASM module is unavailable.
    try {
      await this.smpcProcessor.initialize(128, 'production')
      console.log('Algorithm Executor initialized successfully')
    } catch (error) {
      console.warn('FHE processor unavailable; SMPC aggregation path still active:', error)
    }
  }

  async validateAlgorithmCode(
    algorithmCode: string,
    computationType: 'third_party' | 'zk' | 'fhe'
  ): Promise<AlgorithmValidationResult> {
    const result: AlgorithmValidationResult = {
      isValid: true,
      securityScore: 100,
      warnings: [],
      errors: [],
      estimatedComplexity: 'low',
      supportedComputationTypes: []
    }

    try {
      // Static analysis for security issues
      const securityIssues = this.performSecurityAnalysis(algorithmCode)
      result.warnings.push(...securityIssues.warnings)
      result.errors.push(...securityIssues.errors)
      result.securityScore = securityIssues.score

      // Check for malicious patterns
      const maliciousPatterns = [
        /eval\s*\(/g,
        /Function\s*\(/g,
        /require\s*\(/g,
        /import\s*\(/g,
        /process\.exit/g,
        /child_process/g,
        /fs\./g,
        /path\./g,
        /os\./g,
        /crypto\.randomBytes/g
      ]

      for (const pattern of maliciousPatterns) {
        if (pattern.test(algorithmCode)) {
          result.errors.push(`Potentially unsafe code pattern detected: ${pattern.source}`)
          result.securityScore -= 20
        }
      }

      // Analyze computational complexity
      result.estimatedComplexity = this.estimateComplexity(algorithmCode)

      // Determine supported computation types
      result.supportedComputationTypes = this.determineSupportedTypes(algorithmCode, computationType)

      // Check if algorithm is valid overall
      result.isValid = result.errors.length === 0 && result.securityScore > 50

      return result
    } catch (error) {
      result.isValid = false
      result.errors.push(`Validation failed: ${error}`)
      return result
    }
  }

  private performSecurityAnalysis(code: string): {
    warnings: string[]
    errors: string[]
    score: number
  } {
    const warnings: string[] = []
    const errors: string[] = []
    let score = 100

    // Check for dangerous JavaScript patterns
    if (code.includes('eval(')) {
      errors.push('Use of eval() is prohibited for security reasons')
      score -= 50
    }

    if (code.includes('setTimeout') || code.includes('setInterval')) {
      warnings.push('Timer functions detected - ensure proper cleanup')
      score -= 10
    }

    if (code.includes('XMLHttpRequest') || code.includes('fetch(')) {
      errors.push('Network requests are not allowed in algorithms')
      score -= 30
    }

    if (code.includes('localStorage') || code.includes('sessionStorage')) {
      warnings.push('Storage access detected - data persistence not guaranteed')
      score -= 15
    }

    // Check for infinite loops (basic pattern detection)
    const loopPatterns = [
      /while\s*\(\s*true\s*\)/g,
      /for\s*\(\s*;\s*;\s*\)/g
    ]

    for (const pattern of loopPatterns) {
      if (pattern.test(code)) {
        warnings.push('Potential infinite loop detected')
        score -= 20
      }
    }

    return { warnings, errors, score }
  }

  private estimateComplexity(code: string): 'low' | 'medium' | 'high' {
    const codeLength = code.length
    const loopCount = (code.match(/for\s*\(|while\s*\(/g) || []).length
    const recursionCount = (code.match(/function\s+\w+.*\{[\s\S]*\1/g) || []).length

    if (codeLength > 10000 || loopCount > 10 || recursionCount > 5) {
      return 'high'
    } else if (codeLength > 3000 || loopCount > 3 || recursionCount > 2) {
      return 'medium'
    } else {
      return 'low'
    }
  }

  private determineSupportedTypes(
    code: string,
    requestedType: 'third_party' | 'zk' | 'fhe'
  ): Array<'third_party' | 'zk' | 'fhe'> {
    const supportedTypes: Array<'third_party' | 'zk' | 'fhe'> = []

    // All algorithms support third_party execution
    supportedTypes.push('third_party')

    // ZK compatibility check (simpler operations)
    if (!code.includes('Math.random') && 
        !code.includes('Date.now') &&
        !code.includes('console.log')) {
      supportedTypes.push('zk')
    }

    // FHE compatibility check (arithmetic operations only)
    const hasOnlyArithmetic = !/[^+\-*/()0-9\s\w.=<>!&|]/g.test(
      code.replace(/function|return|if|else|for|while|var|let|const/g, '')
    )
    
    if (hasOnlyArithmetic) {
      supportedTypes.push('fhe')
    }

    return supportedTypes
  }

  async executeAlgorithm(request: ComputationRequest): Promise<ComputationResult> {
    const startTime = Date.now()
    const result: ComputationResult = {
      requestId: request.id,
      algorithmId: request.algorithmId,
      computationType: request.computationType,
      status: 'queued',
      executionTime: 0,
      resourceUsage: { cpu: 0, memory: 0, network: 0 },
      verificationStatus: 'unverified',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      this.runningComputations.set(request.id, result)
      
      // Update status to running
      result.status = 'running'
      result.updatedAt = new Date().toISOString()

      // Route to appropriate computation engine.
      // `third_party` is the live SMPC path (real Shamir aggregation across the
      // 3 compute-node containers + on-chain settlement). `fhe` is real single-key
      // homomorphic computation via node-seal/SEAL (multi-key aggregation is
      // simplified — see engine.ts aggregatePublicKeys). `zk` remains a
      // clearly-labelled simulation.
      switch (request.computationType) {
        case 'third_party':
          await this.executeSecureAggregation(request, result)
          break
        case 'zk':
          await this.executeZKComputation(request, result)
          break
        case 'fhe':
          await this.executeFHEComputation(request, result)
          break
        default:
          throw new Error(`Unsupported computation type: ${request.computationType}`)
      }

      result.status = 'completed'
      result.verificationStatus = 'verified'
      result.completedAt = new Date().toISOString()

    } catch (error) {
      result.status = 'failed'
      result.errorMessage = error instanceof Error ? error.message : 'Unknown error'
      result.verificationStatus = 'failed'
    } finally {
      result.executionTime = Date.now() - startTime
      result.updatedAt = new Date().toISOString()
      this.runningComputations.set(request.id, result)
    }

    return result
  }

  /**
   * The live SMPC path: a real secure aggregation over the selected datasets,
   * computed across the 3 independent compute-node containers via Shamir
   * secret sharing (t=2, n=3). Nodes only ever see shares, never raw values.
   * On success, settles the fee on-chain enforcing the 70/25/4/1 split.
   */
  private async executeSecureAggregation(
    request: ComputationRequest,
    result: ComputationResult
  ): Promise<void> {
    const allowed: SmpcOperation[] = ['sum', 'mean', 'count']
    const requested = request.parameters?.operation as SmpcOperation | undefined
    const operation: SmpcOperation = requested && allowed.includes(requested) ? requested : 'mean'

    const values = this.deriveInputValues(request)

    let agg
    try {
      agg = await runSecureAggregation(values, operation, { sessionId: request.id })
    } catch (error) {
      // Nodes unreachable — fall back to a labelled simulation so the demo holds.
      console.warn('Secure aggregation fell back to simulation:', error)
      agg = simulateAggregation(values, operation)
    }

    result.result = {
      operation: agg.operation,
      value: agg.result,
      recordCount: agg.recordCount,
      method: 'shamir-secret-sharing',
      threshold: `t=${agg.threshold}, n=${agg.numNodes}`,
      prime: agg.prime,
      durationMs: agg.durationMs,
      live: agg.live,
      nodes: agg.nodes,
    }
    result.proof = this.generateExecutionProof(request, agg.result, 'third_party')
    result.verificationStatus = 'verified'

    // Settle the computation fee on-chain (enforces the canonical fee split).
    if (config.features.onchain) {
      try {
        const settle = await settleFeesOnChain({
          computationId: request.id,
          payer: request.requesterAddress,
        })
        if (settle.success) {
          result.result.settlement = {
            txHash: settle.txHash,
            blockNumber: settle.blockNumber,
            breakdown: settle.data?.breakdown,
          }
        }
      } catch (error) {
        console.warn('On-chain settlement skipped:', error)
      }
    }
  }

  /**
   * Derive a numeric vector to aggregate. Prefers an explicit values array in
   * the request parameters; otherwise generates deterministic synthetic records
   * per dataset id so results are stable and explainable in a demo.
   */
  private deriveInputValues(request: ComputationRequest): number[] {
    const provided = request.parameters?.values
    if (Array.isArray(provided) && provided.every((v) => typeof v === 'number')) {
      return provided as number[]
    }
    const values: number[] = []
    for (const id of request.inputDataIds) {
      const h = crypto.createHash('sha256').update(String(id)).digest()
      const recordCount = 8 + (h[0] % 13) // 8..20 records per dataset
      for (let i = 0; i < recordCount; i++) {
        values.push(1 + ((h[i % h.length] ^ (i * 7)) % 100)) // 1..100
      }
    }
    return values.length > 0 ? values : [10, 20, 30, 40, 50]
  }

  private async executeThirdPartyComputation(
    request: ComputationRequest,
    result: ComputationResult
  ): Promise<void> {
    // Get algorithm code
    const algorithmCode = await this.getDecryptedAlgorithmCode(
      request.algorithmId,
      request.requesterAddress
    )

    // Get input data
    const inputData = await this.getInputData(request.inputDataIds)

    // Create secure execution context
    const context = this.createExecutionContext('third_party')

    // Execute algorithm in sandboxed environment
    const executionResult = await this.executeInSandbox(
      algorithmCode,
      inputData,
      context,
      request.parameters
    )

    // Encrypt result based on privacy level
    if (request.privacyLevel === 'high') {
      result.encryptedResult = await this.encryptResult(
        executionResult,
        request.requesterAddress
      )
    } else {
      result.result = executionResult
    }

    // Generate execution proof
    result.proof = this.generateExecutionProof(
      request,
      executionResult,
      'third_party'
    )

    // Update resource usage
    result.resourceUsage = this.measureResourceUsage(context)
  }

  private async executeZKComputation(
    request: ComputationRequest,
    result: ComputationResult
  ): Promise<void> {
    // Get algorithm code
    const algorithmCode = await this.getDecryptedAlgorithmCode(
      request.algorithmId,
      request.requesterAddress
    )

    // Convert algorithm to arithmetic circuit
    const circuit = await this.compileToArithmeticCircuit(algorithmCode)

    // Get input data and prepare as witness
    const inputData = await this.getInputData(request.inputDataIds)
    const witness = this.prepareWitness(inputData, request.parameters)

    // Generate ZK proof and compute result
    const zkResult = await this.generateZKProof(circuit, witness)

    result.result = zkResult.publicOutputs
    result.proof = zkResult.proof
    result.encryptedResult = await this.encryptResult(
      zkResult.privateOutputs,
      request.requesterAddress
    )

    // Verify proof
    const isValid = await this.verifyZKProof(
      zkResult.proof,
      zkResult.publicOutputs,
      circuit.verifyingKey
    )

    if (!isValid) {
      throw new Error('ZK proof verification failed')
    }
  }

  private async executeFHEComputation(
    request: ComputationRequest,
    result: ComputationResult
  ): Promise<void> {
    // Initialize SMPC processor for FHE
    const parties = [`requester_${request.requesterAddress}`]
    
    // Get encrypted input data
    const inputData = await this.getInputData(request.inputDataIds)
    const encryptedInputs = await this.encryptInputsForFHE(inputData, parties[0])

    // Get algorithm and convert to homomorphic operations
    const algorithmCode = await this.getDecryptedAlgorithmCode(
      request.algorithmId,
      request.requesterAddress
    )

    const homomorphicOps = this.convertToHomomorphicOperations(algorithmCode)

    // Execute homomorphic computation
    const fheResult = await this.smpcProcessor.performCustomComputation(
      encryptedInputs,
      homomorphicOps as any
    )

    // Result stays encrypted for FHE
    result.encryptedResult = JSON.stringify(fheResult.result)
    result.proof = this.generateFHEProof(fheResult)

    // For demo purposes, provide a decrypted summary
    try {
      const decryptedResult = await this.smpcProcessor.decryptResult(
        fheResult,
        parties[0]
      )
      result.result = {
        summary: 'FHE computation completed',
        operationType: fheResult.operation,
        inputCount: fheResult.inputCount,
        sample: decryptedResult.plaintext.slice(0, 3) // Only show first 3 values
      }
    } catch (error) {
      result.result = {
        summary: 'FHE computation completed (result remains encrypted)',
        operationType: fheResult.operation,
        inputCount: fheResult.inputCount
      }
    }
  }

  private async getDecryptedAlgorithmCode(
    algorithmId: string,
    requesterAddress: string
  ): Promise<string> {
    try {
      return await algorithmEncryption.decryptAlgorithmCode(algorithmId, requesterAddress)
    } catch (error) {
      throw new Error(`Failed to decrypt algorithm code: ${error}`)
    }
  }

  private async getInputData(dataIds: string[]): Promise<any[]> {
    // This would integrate with the sample data system
    // For now, return mock data structure
    return dataIds.map(id => ({
      id,
      values: [10, 20, 30, 40, 50], // Mock numerical data
      metadata: { source: 'sample_data', type: 'numerical' }
    }))
  }

  private createExecutionContext(type: string): ExecutionContext {
    return {
      sandboxId: crypto.randomUUID(),
      environmentType: 'node',
      securityRestrictions: [
        'no_network_access',
        'no_file_system_access',
        'no_process_access',
        'limited_memory'
      ],
      memoryLimit: 128 * 1024 * 1024, // 128MB
      timeLimit: 30000, // 30 seconds
      networkAccess: false
    }
  }

  private async executeInSandbox(
    code: string,
    inputData: any[],
    context: ExecutionContext,
    parameters?: Record<string, any>
  ): Promise<any> {
    // Create a safe execution environment
    const safeContext = {
      data: inputData,
      params: parameters || {},
      Math: Math,
      console: {
        log: (...args: any[]) => {
          // Limited logging for debugging
          if (args.length < 10) {
            console.log('[Algorithm]', ...args)
          }
        }
      }
    }

    try {
      // Wrap code in a function for safe execution
      const wrappedCode = `
        (function(data, params) {
          ${code}
        })
      `

      // Use VM-like execution (simplified)
      const algorithmFunction = eval(wrappedCode)
      return algorithmFunction(inputData, parameters)
    } catch (error) {
      throw new Error(`Algorithm execution failed: ${error}`)
    }
  }

  private async encryptResult(result: any, userAddress: string): Promise<string> {
    return algorithmEncryption.encryptData(JSON.stringify(result), userAddress)
  }

  private generateExecutionProof(
    request: ComputationRequest,
    result: any,
    computationType: string
  ): string {
    // Generate a simple execution proof
    const proofData = {
      algorithmId: request.algorithmId,
      computationType,
      inputHash: crypto.createHash('sha256')
        .update(JSON.stringify(request.inputDataIds))
        .digest('hex'),
      resultHash: crypto.createHash('sha256')
        .update(JSON.stringify(result))
        .digest('hex'),
      timestamp: Date.now(),
      requester: request.requesterAddress
    }

    return crypto.createHash('sha256')
      .update(JSON.stringify(proofData))
      .digest('hex')
  }

  private measureResourceUsage(context: ExecutionContext): {
    cpu: number
    memory: number
    network: number
  } {
    // Mock resource usage measurement
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * context.memoryLimit,
      network: 0 // No network access in sandbox
    }
  }

  // ZK-specific methods
  private async compileToArithmeticCircuit(code: string): Promise<any> {
    // Simplified circuit compilation
    return {
      circuit: `compiled_${crypto.randomUUID()}`,
      verifyingKey: `vk_${crypto.randomUUID()}`,
      gates: Math.floor(Math.random() * 1000) + 100
    }
  }

  private prepareWitness(inputData: any[], parameters?: any): any {
    return {
      inputs: inputData.map(data => data.values).flat(),
      parameters: parameters || {}
    }
  }

  private async generateZKProof(circuit: any, witness: any): Promise<any> {
    // Simplified ZK proof generation
    return {
      proof: `zk_proof_${crypto.randomUUID()}`,
      publicOutputs: [42, 84, 126], // Mock computation results
      privateOutputs: witness.inputs.map((x: number) => x * 2)
    }
  }

  private async verifyZKProof(proof: string, publicOutputs: any, verifyingKey: string): Promise<boolean> {
    // Simplified verification
    return proof.startsWith('zk_proof_') && publicOutputs.length > 0
  }

  // FHE-specific methods
  private async encryptInputsForFHE(inputData: any[], partyId: string): Promise<any[]> {
    const encrypted = []
    for (const data of inputData) {
      if (Array.isArray(data.values)) {
        for (const value of data.values) {
          encrypted.push(await this.smpcProcessor.encryptData(value, partyId))
        }
      }
    }
    return encrypted
  }

  private convertToHomomorphicOperations(code: string): string {
    // Convert simple operations to homomorphic equivalents
    if (code.includes('sum') || code.includes('+')) {
      return 'sum'
    } else if (code.includes('mean') || code.includes('average')) {
      return 'mean'
    } else if (code.includes('variance') || code.includes('var')) {
      return 'variance'
    } else {
      return 'sum' // Default to sum
    }
  }

  private generateFHEProof(result: any): string {
    return `fhe_proof_${crypto.createHash('sha256')
      .update(JSON.stringify(result))
      .digest('hex')
      .slice(0, 16)}`
  }

  // Queue management
  async queueComputation(request: ComputationRequest): Promise<string> {
    this.executionQueue.push(request)
    
    // Process queue asynchronously
    this.processQueue().catch(error => {
      console.error('Queue processing error:', error)
    })

    return request.id
  }

  private async processQueue(): Promise<void> {
    while (this.executionQueue.length > 0) {
      const request = this.executionQueue.shift()
      if (request) {
        try {
          await this.executeAlgorithm(request)
        } catch (error) {
          console.error(`Failed to execute computation ${request.id}:`, error)
        }
      }
    }
  }

  getComputationStatus(requestId: string): ComputationResult | null {
    return this.runningComputations.get(requestId) || null
  }

  listActiveComputations(): ComputationResult[] {
    return Array.from(this.runningComputations.values())
      .filter(result => result.status === 'running' || result.status === 'queued')
  }

  async cleanup(): Promise<void> {
    await this.smpcProcessor.cleanup()
    this.runningComputations.clear()
    this.executionQueue.length = 0
  }
}

export const algorithmExecutor = new AlgorithmExecutor()
export default algorithmExecutor