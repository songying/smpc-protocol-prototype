import { ContractClient } from './contract-client'
import { ethers } from 'ethers'

export interface DataEntry {
  dataHash: string
  provider: string
  metadataURI: string
  price: bigint
  status: number // DataStatus enum
  category: number // DataCategory enum
  timestamp: bigint
  lastUpdated: bigint
  tags: string[]
  isEncrypted: boolean
  accessCount: bigint
  dataSize: bigint
}

export interface RegisterDataParams {
  dataHash: string
  metadataURI: string
  price: bigint
  category: number
  tags: string[]
  isEncrypted: boolean
  dataSize: bigint
}

export class DataRegistryService {
  private contractClient: ContractClient
  private readonly contractName = 'DataRegistry'

  // Data categories enum
  static readonly DataCategory = {
    Personal: 0,
    Financial: 1,
    Health: 2,
    Behavioral: 3,
    Commercial: 4,
    Other: 5
  } as const

  // Data status enum
  static readonly DataStatus = {
    Pending: 0,
    Active: 1,
    Suspended: 2,
    Deactivated: 3
  } as const

  constructor(contractClient: ContractClient) {
    this.contractClient = contractClient
  }

  // Register new data entry
  async registerData(params: RegisterDataParams) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'registerData',
      [
        params.dataHash,
        params.metadataURI,
        params.price,
        params.category,
        params.tags,
        params.isEncrypted,
        params.dataSize
      ]
    )
  }

  // Update existing data entry
  async updateData(
    dataHash: string,
    newPrice: bigint,
    newMetadataURI: string
  ) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'updateData',
      [dataHash, newPrice, newMetadataURI]
    )
  }

  // Change data status (admin/auditor only)
  async changeDataStatus(dataHash: string, newStatus: number) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'changeDataStatus',
      [dataHash, newStatus]
    )
  }

  // Record data access
  async recordDataAccess(dataHash: string) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'recordDataAccess',
      [dataHash]
    )
  }

  // Get data entry details
  async getDataEntry(dataHash: string): Promise<DataEntry | null> {
    const result = await this.contractClient.callMethod(
      this.contractName,
      'getDataEntry',
      [dataHash]
    )
    
    if (!result.success) return null
    
    return this.parseDataEntry(result.data)
  }

  // Get data entries by provider
  async getProviderData(provider: string): Promise<string[]> {
    const result = await this.contractClient.callMethod(
      this.contractName,
      'getProviderData',
      [provider]
    )
    
    return result.success ? result.data : []
  }

  // Get data entries by category
  async getDataByCategory(category: number): Promise<string[]> {
    const result = await this.contractClient.callMethod(
      this.contractName,
      'getDataByCategory',
      [category]
    )
    
    return result.success ? result.data : []
  }

  // Get active data entries by category
  async getActiveDataByCategory(category: number): Promise<string[]> {
    const result = await this.contractClient.callMethod(
      this.contractName,
      'getActiveDataByCategory',
      [category]
    )
    
    return result.success ? result.data : []
  }

  // Grant provider role
  async grantProviderRole(provider: string) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'grantProviderRole',
      [provider]
    )
  }

  // Grant consumer role
  async grantConsumerRole(consumer: string) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'grantConsumerRole',
      [consumer]
    )
  }

  // Grant auditor role
  async grantAuditorRole(auditor: string) {
    return await this.contractClient.executeTransaction(
      this.contractName,
      'grantAuditorRole',
      [auditor]
    )
  }

  // Check if address has role
  async hasProviderRole(address: string): Promise<boolean> {
    return await this.contractClient.hasRole(this.contractName, 'DATA_PROVIDER_ROLE', address)
  }

  async hasConsumerRole(address: string): Promise<boolean> {
    return await this.contractClient.hasRole(this.contractName, 'CONSUMER_ROLE', address)
  }

  async hasAuditorRole(address: string): Promise<boolean> {
    return await this.contractClient.hasRole(this.contractName, 'AUDITOR_ROLE', address)
  }

  async hasAdminRole(address: string): Promise<boolean> {
    return await this.contractClient.hasRole(this.contractName, 'ADMIN_ROLE', address)
  }

  // Get contract statistics
  async getStatistics() {
    const result = await this.contractClient.callMethod(
      this.contractName,
      'getStatistics'
    )
    
    if (!result.success) return null
    
    return {
      totalData: result.data[0],
      activeData: result.data[1], 
      totalProviders: result.data[2]
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
  onDataRegistered(callback: (dataHash: string, provider: string, category: number, price: bigint) => void) {
    return this.contractClient.addEventListener(
      this.contractName,
      'DataRegistered',
      (dataHash, provider, category, price, timestamp, event) => {
        callback(dataHash, provider, category, price)
      }
    )
  }

  onDataUpdated(callback: (dataHash: string, provider: string, newPrice: bigint) => void) {
    return this.contractClient.addEventListener(
      this.contractName,
      'DataUpdated',
      (dataHash, provider, newPrice, timestamp, event) => {
        callback(dataHash, provider, newPrice)
      }
    )
  }

  onDataStatusChanged(callback: (dataHash: string, oldStatus: number, newStatus: number, changedBy: string) => void) {
    return this.contractClient.addEventListener(
      this.contractName,
      'DataStatusChanged',
      (dataHash, oldStatus, newStatus, changedBy, event) => {
        callback(dataHash, oldStatus, newStatus, changedBy)
      }
    )
  }

  onDataAccessed(callback: (dataHash: string, accessor: string) => void) {
    return this.contractClient.addEventListener(
      this.contractName,
      'DataAccessed',
      (dataHash, accessor, timestamp, event) => {
        callback(dataHash, accessor)
      }
    )
  }

  // Get past events
  async getDataRegisteredEvents(fromBlock: number = 0) {
    return await this.contractClient.getPastEvents(
      this.contractName,
      'DataRegistered',
      fromBlock
    )
  }

  async getDataStatusChangedEvents(fromBlock: number = 0) {
    return await this.contractClient.getPastEvents(
      this.contractName,
      'DataStatusChanged',
      fromBlock
    )
  }

  // Utility methods
  private parseDataEntry(rawData: any): DataEntry {
    return {
      dataHash: rawData.dataHash,
      provider: rawData.provider,
      metadataURI: rawData.metadataURI,
      price: rawData.price,
      status: rawData.status,
      category: rawData.category,
      timestamp: rawData.timestamp,
      lastUpdated: rawData.lastUpdated,
      tags: rawData.tags,
      isEncrypted: rawData.isEncrypted,
      accessCount: rawData.accessCount,
      dataSize: rawData.dataSize
    }
  }

  // Helper to create data hash
  static createDataHash(data: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(data))
  }

  // Helper to format price to ETH
  static formatPrice(price: bigint): string {
    return ethers.formatEther(price)
  }

  // Helper to parse ETH to wei
  static parsePrice(ethAmount: string): bigint {
    return ethers.parseEther(ethAmount)
  }

  // Estimate gas for operations
  async estimateRegisterDataGas(params: RegisterDataParams): Promise<bigint | null> {
    return await this.contractClient.estimateGas(
      this.contractName,
      'registerData',
      [
        params.dataHash,
        params.metadataURI,
        params.price,
        params.category,
        params.tags,
        params.isEncrypted,
        params.dataSize
      ]
    )
  }

  async estimateUpdateDataGas(
    dataHash: string,
    newPrice: bigint,
    newMetadataURI: string
  ): Promise<bigint | null> {
    return await this.contractClient.estimateGas(
      this.contractName,
      'updateData',
      [dataHash, newPrice, newMetadataURI]
    )
  }
}

export default DataRegistryService