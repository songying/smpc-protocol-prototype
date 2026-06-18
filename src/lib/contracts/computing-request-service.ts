import { ContractClient } from './contract-client'
import { ethers } from 'ethers'

export interface ComputingRequest {
  requestId: string
  consumer: string
  dataHashes: string[]
  totalFee: bigint
  status: number
  computationType: number
  computingScript: string
  resultURI: string
  resultHash: string
  timestamp: bigint
  deadline: bigint
  approvalCount: bigint
  requiredApprovals: bigint
  approvers: string[]
  requirements: string[]
  isUrgent: boolean
  maxComputingTime: bigint
  assignedNode: string
}

export interface SubmitRequestParams {
  dataHashes: string[]
  computationType: number
  computingScript: string
  deadline: bigint
  requirements: string[]
  isUrgent: boolean
  maxComputingTime: bigint
  value: bigint // ETH to send as fee
}

export class ComputingRequestService {
  private contractClient: ContractClient
  private readonly contractName = 'ComputingRequest'

  // Computing status enum
  static readonly ComputingStatus = {
    Pending: 0,
    Approved: 1,
    Computing: 2,
    Completed: 3,
    Failed: 4,
    Cancelled: 5,
    Disputed: 6
  } as const

  // Computation type enum
  static readonly ComputationType = {
    Aggregation: 0,
    MachineLearning: 1,
    Analytics: 2,
    Comparison: 3,
    Custom: 4
  } as const

  constructor(contractClient: ContractClient) {
    this.contractClient = contractClient
  }

  // Submit a new computing request
  async submitRequest(params: SubmitRequestParams) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'submitRequest',
      [
        params.dataHashes,
        params.computationType,
        params.computingScript,
        params.deadline,
        params.requirements,
        params.isUrgent,
        params.maxComputingTime
      ],
      { value: params.value }
    )
  }

  // Approve a computing request (auditor only)
  async approveRequest(requestId: string) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'approveRequest',
      [requestId]
    )
  }

  // Assign computing node to approved request (admin only)
  async assignComputingNode(requestId: string, computingNode: string) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'assignComputingNode',
      [requestId, computingNode]
    )
  }

  // Start computing (computing node only)
  async startComputing(requestId: string) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'startComputing',
      [requestId]
    )
  }

  // Submit computation results (computing node only)
  async submitResults(
    requestId: string,
    resultHash: string,
    resultURI: string
  ) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'submitResults',
      [requestId, resultHash, resultURI]
    )
  }

  // Mark request as failed (admin only)
  async markRequestFailed(requestId: string, reason: string) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'markRequestFailed',
      [requestId, reason]
    )
  }

  // Cancel request (consumer only, before computing starts)
  async cancelRequest(requestId: string, reason: string) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'cancelRequest',
      [requestId, reason]
    )
  }

  // Get request information
  async getRequestInfo(requestId: string): Promise<ComputingRequest | null> {
    const result = await this.contractClient.callMethod(
      this.contractName,
      'getRequestInfo',
      [requestId]
    )
    
    if (!result.success) return null
    
    return this.parseRequestInfo(result.data)
  }

  // Get requests by consumer
  async getConsumerRequests(consumer: string): Promise<string[]> {
    const result = await this.contractClient.callMethod(
      this.contractName,
      'getConsumerRequests',
      [consumer]
    )
    
    return result.success ? result.data : []
  }

  // Get requests by status
  async getRequestsByStatus(status: number): Promise<string[]> {
    const result = await this.contractClient.callMethod(
      this.contractName,
      'getRequestsByStatus',
      [status]
    )
    
    return result.success ? result.data : []
  }

  // Grant roles
  async grantConsumerRole(consumer: string) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'grantConsumerRole',
      [consumer]
    )
  }

  async grantAuditorRole(auditor: string) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'grantAuditorRole',
      [auditor]
    )
  }

  async grantComputingNodeRole(node: string) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'grantComputingNodeRole',
      [node]
    )
  }

  // Check roles
  async hasConsumerRole(address: string): Promise<boolean> {
    return await this.contractClient.hasRole(this.contractName, 'CONSUMER_ROLE', address)
  }

  async hasAuditorRole(address: string): Promise<boolean> {
    return await this.contractClient.hasRole(this.contractName, 'AUDITOR_ROLE', address)
  }

  async hasComputingNodeRole(address: string): Promise<boolean> {
    return await this.contractClient.hasRole(this.contractName, 'COMPUTING_NODE_ROLE', address)
  }

  async hasAdminRole(address: string): Promise<boolean> {
    return await this.contractClient.hasRole(this.contractName, 'ADMIN_ROLE', address)
  }

  // Update configuration (admin only)
  async updateConfiguration(
    defaultRequiredApprovals: bigint,
    maxComputingDuration: bigint,
    minComputingFee: bigint
  ) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'updateConfiguration',
      [defaultRequiredApprovals, maxComputingDuration, minComputingFee]
    )
  }

  // Get contract statistics
  async getStatistics() {
    const result = await this.contractClient.callMethod(
      this.contractName,
      'getStatistics'
    )
    
    if (!result.success) return null
    
    return {
      total: result.data[0],
      completed: result.data[1],
      failed: result.data[2],
      pending: result.data[3]
    }
  }

  // Get configuration values
  async getConfiguration() {
    const results = await Promise.all([
      this.contractClient.callMethod(this.contractName, 'defaultRequiredApprovals'),
      this.contractClient.callMethod(this.contractName, 'maxComputingDuration'),
      this.contractClient.callMethod(this.contractName, 'minComputingFee')
    ])
    
    return {
      defaultRequiredApprovals: results[0].success ? results[0].data : null,
      maxComputingDuration: results[1].success ? results[1].data : null,
      minComputingFee: results[2].success ? results[2].data : null
    }
  }

  // Pause/unpause contract (admin only)
  async pause() {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'pause'
    )
  }

  async unpause() {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'unpause'
    )
  }

  // Event listeners
  onRequestSubmitted(
    callback: (requestId: string, consumer: string, dataHashes: string[], totalFee: bigint, computationType: number) => void
  ) {
    return this.contractClient.addEventListener(
      this.contractName,
      'RequestSubmitted',
      (requestId, consumer, dataHashes, totalFee, computationType, event) => {
        callback(requestId, consumer, dataHashes, totalFee, computationType)
      }
    )
  }

  onRequestApproved(
    callback: (requestId: string, auditor: string, approvalCount: bigint, requiredApprovals: bigint) => void
  ) {
    return this.contractClient.addEventListener(
      this.contractName,
      'RequestApproved',
      (requestId, auditor, approvalCount, requiredApprovals, event) => {
        callback(requestId, auditor, approvalCount, requiredApprovals)
      }
    )
  }

  onRequestStatusChanged(
    callback: (requestId: string, oldStatus: number, newStatus: number, changedBy: string) => void
  ) {
    return this.contractClient.addEventListener(
      this.contractName,
      'RequestStatusChanged',
      (requestId, oldStatus, newStatus, changedBy, event) => {
        callback(requestId, oldStatus, newStatus, changedBy)
      }
    )
  }

  onComputingStarted(
    callback: (requestId: string, computingNode: string, startTime: bigint) => void
  ) {
    return this.contractClient.addEventListener(
      this.contractName,
      'ComputingStarted',
      (requestId, computingNode, startTime, event) => {
        callback(requestId, computingNode, startTime)
      }
    )
  }

  onComputingCompleted(
    callback: (requestId: string, resultHash: string, resultURI: string, completionTime: bigint) => void
  ) {
    return this.contractClient.addEventListener(
      this.contractName,
      'ComputingCompleted',
      (requestId, resultHash, resultURI, completionTime, event) => {
        callback(requestId, resultHash, resultURI, completionTime)
      }
    )
  }

  onRequestCancelled(
    callback: (requestId: string, consumer: string, reason: string) => void
  ) {
    return this.contractClient.addEventListener(
      this.contractName,
      'RequestCancelled',
      (requestId, consumer, reason, event) => {
        callback(requestId, consumer, reason)
      }
    )
  }

  onComputingNodeAssigned(
    callback: (requestId: string, node: string) => void
  ) {
    return this.contractClient.addEventListener(
      this.contractName,
      'ComputingNodeAssigned',
      (requestId, node, event) => {
        callback(requestId, node)
      }
    )
  }

  // Get past events
  async getRequestSubmittedEvents(fromBlock: number = 0) {
    return await this.contractClient.getPastEvents(
      this.contractName,
      'RequestSubmitted',
      fromBlock
    )
  }

  async getComputingCompletedEvents(fromBlock: number = 0) {
    return await this.contractClient.getPastEvents(
      this.contractName,
      'ComputingCompleted',
      fromBlock
    )
  }

  // Utility methods
  private parseRequestInfo(rawData: any): ComputingRequest {
    return {
      requestId: rawData.requestId,
      consumer: rawData.consumer,
      dataHashes: rawData.dataHashes,
      totalFee: rawData.totalFee,
      status: rawData.status,
      computationType: rawData.computationType,
      computingScript: rawData.computingScript,
      resultURI: rawData.resultURI,
      resultHash: rawData.resultHash,
      timestamp: rawData.timestamp,
      deadline: rawData.deadline,
      approvalCount: rawData.approvalCount,
      requiredApprovals: rawData.requiredApprovals,
      approvers: rawData.approvers,
      requirements: rawData.requirements,
      isUrgent: rawData.isUrgent,
      maxComputingTime: rawData.maxComputingTime,
      assignedNode: rawData.assignedNode
    }
  }

  // Helper to create result hash
  static createResultHash(result: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(result))
  }

  // Helper to format fee to ETH
  static formatFee(fee: bigint): string {
    return ethers.formatEther(fee)
  }

  // Helper to parse ETH to wei
  static parseFee(ethAmount: string): bigint {
    return ethers.parseEther(ethAmount)
  }

  // Calculate deadline (current time + duration in seconds)
  static calculateDeadline(durationInSeconds: number): bigint {
    return BigInt(Math.floor(Date.now() / 1000) + durationInSeconds)
  }

  // Estimate gas for operations
  async estimateSubmitRequestGas(params: SubmitRequestParams): Promise<bigint | null> {
    return await this.contractClient.estimateGas(
      this.contractName,
      'submitRequest',
      [
        params.dataHashes,
        params.computationType,
        params.computingScript,
        params.deadline,
        params.requirements,
        params.isUrgent,
        params.maxComputingTime
      ]
    )
  }

  async estimateApproveRequestGas(requestId: string): Promise<bigint | null> {
    return await this.contractClient.estimateGas(
      this.contractName,
      'approveRequest',
      [requestId]
    )
  }

  async estimateSubmitResultsGas(
    requestId: string,
    resultHash: string,
    resultURI: string
  ): Promise<bigint | null> {
    return await this.contractClient.estimateGas(
      this.contractName,
      'submitResults',
      [requestId, resultHash, resultURI]
    )
  }
}

export default ComputingRequestService