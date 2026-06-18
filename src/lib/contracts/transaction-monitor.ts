import { ethers } from 'ethers'
import { ContractClient } from './contract-client'
import redisClient from '../database/redis-client'

export interface TransactionInfo {
  hash: string
  from: string
  to: string
  value: string
  gasLimit: string
  gasPrice: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  nonce: number
  data: string
  chainId: number
  timestamp: number
  status: 'pending' | 'confirmed' | 'failed' | 'replaced'
  confirmations: number
  gasUsed?: string
  effectiveGasPrice?: string
  contractName?: string
  methodName?: string
  args?: any[]
}

export interface GasEstimate {
  gasLimit: bigint
  gasPrice: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  estimatedCost: bigint
  priority: 'slow' | 'standard' | 'fast'
}

export interface TransactionOptions {
  gasLimit?: bigint
  gasPrice?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  value?: bigint
  priority?: 'slow' | 'standard' | 'fast'
  confirmations?: number
  timeout?: number
}

export class TransactionMonitor {
  private contractClient: ContractClient
  private provider: ethers.Provider
  private pendingTransactions: Map<string, TransactionInfo> = new Map()
  private eventEmitter = new EventTarget()

  constructor(contractClient: ContractClient) {
    this.contractClient = contractClient
    this.provider = (contractClient as any).provider

    // Start monitoring
    this.startMonitoring()
  }

  // Start monitoring pending transactions
  private startMonitoring() {
    setInterval(async () => {
      await this.checkPendingTransactions()
    }, 10000) // Check every 10 seconds
  }

  // Submit transaction with monitoring
  async submitTransaction(
    contractName: string,
    methodName: string,
    args: any[] = [],
    options: TransactionOptions = {}
  ): Promise<{
    success: boolean
    transactionHash?: string
    receipt?: any
    error?: string
    gasUsed?: string
  }> {
    try {
      // Get optimized gas settings
      const gasEstimate = await this.estimateOptimalGas(
        contractName,
        methodName,
        args,
        options.priority || 'standard',
        options.value
      )

      if (!gasEstimate) {
        return {
          success: false,
          error: 'Failed to estimate gas'
        }
      }

      // Execute transaction with optimized settings
      const txOptions = {
        gasLimit: options.gasLimit || gasEstimate.gasLimit,
        ...(gasEstimate.maxFeePerGas && { maxFeePerGas: options.maxFeePerGas || gasEstimate.maxFeePerGas }),
        ...(gasEstimate.maxPriorityFeePerGas && { maxPriorityFeePerGas: options.maxPriorityFeePerGas || gasEstimate.maxPriorityFeePerGas }),
        ...(!gasEstimate.maxFeePerGas && { gasPrice: options.gasPrice || gasEstimate.gasPrice }),
        ...(options.value && { value: options.value })
      }

      const result = await this.contractClient.executeTransaction(
        contractName,
        methodName,
        args,
        txOptions
      )

      if (result.success && result.transactionHash) {
        // Add to monitoring
        await this.addTransaction({
          hash: result.transactionHash,
          from: await this.contractClient.getSignerAddress() || '',
          to: this.contractClient.getContractAddress(contractName) || '',
          value: options.value ? ethers.formatEther(options.value) : '0',
          gasLimit: txOptions.gasLimit.toString(),
          gasPrice: txOptions.gasPrice?.toString() || '0',
          maxFeePerGas: txOptions.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: txOptions.maxPriorityFeePerGas?.toString(),
          nonce: 0, // Will be updated when we get full transaction data
          data: '',
          chainId: (await this.provider.getNetwork()).chainId,
          timestamp: Date.now(),
          status: 'pending',
          confirmations: 0,
          contractName,
          methodName,
          args
        })

        // Wait for confirmation if requested
        if (options.confirmations && options.confirmations > 0) {
          const confirmed = await this.waitForConfirmation(
            result.transactionHash,
            options.confirmations,
            options.timeout || 300000 // 5 minutes default
          )

          if (!confirmed) {
            return {
              success: false,
              transactionHash: result.transactionHash,
              error: 'Transaction confirmation timeout'
            }
          }
        }
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Estimate optimal gas settings
  async estimateOptimalGas(
    contractName: string,
    methodName: string,
    args: any[] = [],
    priority: 'slow' | 'standard' | 'fast' = 'standard',
    value?: bigint
  ): Promise<GasEstimate | null> {
    try {
      // Get base gas estimate
      const gasLimit = await this.contractClient.estimateGas(contractName, methodName, args)
      if (!gasLimit) return null

      // Get current network fee data
      const feeData = await this.provider.getFeeData()
      if (!feeData.gasPrice) return null

      // Calculate gas settings based on priority
      let gasPrice = feeData.gasPrice
      let maxFeePerGas = feeData.maxFeePerGas
      let maxPriorityFeePerGas = feeData.maxPriorityFeePerGas

      // Adjust based on priority
      const multiplier = {
        slow: 0.9,
        standard: 1.0,
        fast: 1.2
      }[priority]

      gasPrice = BigInt(Math.floor(Number(gasPrice) * multiplier))

      if (maxFeePerGas && maxPriorityFeePerGas) {
        maxFeePerGas = BigInt(Math.floor(Number(maxFeePerGas) * multiplier))
        maxPriorityFeePerGas = BigInt(Math.floor(Number(maxPriorityFeePerGas) * multiplier))
      }

      // Add buffer to gas limit
      const bufferedGasLimit = gasLimit + (gasLimit / BigInt(10)) // Add 10% buffer

      // Calculate estimated cost
      const estimatedCost = bufferedGasLimit * gasPrice

      return {
        gasLimit: bufferedGasLimit,
        gasPrice,
        maxFeePerGas: maxFeePerGas || undefined,
        maxPriorityFeePerGas: maxPriorityFeePerGas || undefined,
        estimatedCost,
        priority
      }
    } catch (error) {
      console.error('Failed to estimate optimal gas:', error)
      return null
    }
  }

  // Add transaction to monitoring
  async addTransaction(txInfo: TransactionInfo) {
    this.pendingTransactions.set(txInfo.hash, txInfo)
    
    // Store in Redis for persistence
    await redisClient.setex(
      `tx:${txInfo.hash}`,
      24 * 60 * 60, // 24 hours
      JSON.stringify(txInfo)
    )

    // Emit event
    this.eventEmitter.dispatchEvent(new CustomEvent('transactionAdded', {
      detail: txInfo
    }))
  }

  // Check status of pending transactions
  private async checkPendingTransactions() {
    const hashes = Array.from(this.pendingTransactions.keys())
    
    for (const hash of hashes) {
      try {
        const receipt = await this.provider.getTransactionReceipt(hash)
        
        if (receipt) {
          const txInfo = this.pendingTransactions.get(hash)!
          
          // Update transaction info
          txInfo.status = receipt.status === 1 ? 'confirmed' : 'failed'
          txInfo.confirmations = await this.provider.getBlockNumber() - receipt.blockNumber
          txInfo.gasUsed = receipt.gasUsed.toString()
          txInfo.effectiveGasPrice = receipt.gasPrice?.toString()

          // Update in storage
          await redisClient.setex(
            `tx:${hash}`,
            24 * 60 * 60,
            JSON.stringify(txInfo)
          )

          // Remove from pending if enough confirmations
          if (txInfo.confirmations >= 1) {
            this.pendingTransactions.delete(hash)
          }

          // Emit event
          this.eventEmitter.dispatchEvent(new CustomEvent('transactionUpdated', {
            detail: txInfo
          }))
        }
      } catch (error) {
        console.error(`Failed to check transaction ${hash}:`, error)
      }
    }
  }

  // Wait for transaction confirmation
  async waitForConfirmation(
    txHash: string,
    confirmations: number = 1,
    timeout: number = 300000
  ): Promise<boolean> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      try {
        const receipt = await this.provider.getTransactionReceipt(txHash)
        
        if (receipt) {
          const currentBlock = await this.provider.getBlockNumber()
          const txConfirmations = currentBlock - receipt.blockNumber
          
          if (txConfirmations >= confirmations) {
            return receipt.status === 1
          }
        }
        
        // Wait 5 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 5000))
      } catch (error) {
        console.error('Error waiting for confirmation:', error)
      }
    }
    
    return false
  }

  // Get transaction info
  async getTransactionInfo(hash: string): Promise<TransactionInfo | null> {
    // Check in-memory first
    const pending = this.pendingTransactions.get(hash)
    if (pending) return pending

    // Check Redis
    try {
      const stored = await redisClient.get(`tx:${hash}`)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to get transaction from Redis:', error)
    }

    // Get from blockchain
    try {
      const [tx, receipt] = await Promise.all([
        this.provider.getTransaction(hash),
        this.provider.getTransactionReceipt(hash)
      ])

      if (tx) {
        const txInfo: TransactionInfo = {
          hash: tx.hash,
          from: tx.from,
          to: tx.to || '',
          value: ethers.formatEther(tx.value),
          gasLimit: tx.gasLimit.toString(),
          gasPrice: tx.gasPrice?.toString() || '0',
          maxFeePerGas: tx.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
          nonce: tx.nonce,
          data: tx.data,
          chainId: tx.chainId || 0,
          timestamp: Date.now(),
          status: receipt ? (receipt.status === 1 ? 'confirmed' : 'failed') : 'pending',
          confirmations: receipt ? (await this.provider.getBlockNumber() - receipt.blockNumber) : 0,
          gasUsed: receipt?.gasUsed.toString(),
          effectiveGasPrice: receipt?.gasPrice?.toString()
        }

        return txInfo
      }
    } catch (error) {
      console.error('Failed to get transaction from blockchain:', error)
    }

    return null
  }

  // Get all pending transactions
  getPendingTransactions(): TransactionInfo[] {
    return Array.from(this.pendingTransactions.values())
  }

  // Get transaction history for address
  async getTransactionHistory(
    address: string,
    limit: number = 100
  ): Promise<TransactionInfo[]> {
    try {
      const keys = await redisClient.keys(`tx:*`)
      const transactions: TransactionInfo[] = []

      for (const key of keys.slice(0, limit)) {
        const txData = await redisClient.get(key)
        if (txData) {
          const txInfo: TransactionInfo = JSON.parse(txData)
          if (txInfo.from === address || txInfo.to === address) {
            transactions.push(txInfo)
          }
        }
      }

      // Sort by timestamp (newest first)
      return transactions.sort((a, b) => b.timestamp - a.timestamp)
    } catch (error) {
      console.error('Failed to get transaction history:', error)
      return []
    }
  }

  // Calculate transaction cost
  static calculateTransactionCost(txInfo: TransactionInfo): string {
    const gasUsed = BigInt(txInfo.gasUsed || txInfo.gasLimit)
    const gasPrice = BigInt(txInfo.effectiveGasPrice || txInfo.gasPrice)
    const cost = gasUsed * gasPrice
    return ethers.formatEther(cost)
  }

  // Event listeners
  onTransactionAdded(callback: (txInfo: TransactionInfo) => void): () => void {
    const handler = (event: Event) => {
      callback((event as CustomEvent).detail)
    }
    this.eventEmitter.addEventListener('transactionAdded', handler)
    return () => this.eventEmitter.removeEventListener('transactionAdded', handler)
  }

  onTransactionUpdated(callback: (txInfo: TransactionInfo) => void): () => void {
    const handler = (event: Event) => {
      callback((event as CustomEvent).detail)
    }
    this.eventEmitter.addEventListener('transactionUpdated', handler)
    return () => this.eventEmitter.removeEventListener('transactionUpdated', handler)
  }

  // Replace stuck transaction with higher gas price
  async replaceTransaction(
    originalHash: string,
    newGasPrice?: bigint,
    newData?: string
  ): Promise<{ success: boolean; newHash?: string; error?: string }> {
    try {
      const originalTx = await this.provider.getTransaction(originalHash)
      if (!originalTx) {
        return { success: false, error: 'Original transaction not found' }
      }

      if (await this.provider.getTransactionReceipt(originalHash)) {
        return { success: false, error: 'Transaction already confirmed' }
      }

      const signer = await this.contractClient.getSignerAddress()
      if (!signer) {
        return { success: false, error: 'No signer available' }
      }

      // Increase gas price by 10% minimum
      const currentGasPrice = originalTx.gasPrice || BigInt(0)
      const minNewGasPrice = currentGasPrice + (currentGasPrice / BigInt(10))
      const finalGasPrice = newGasPrice && newGasPrice > minNewGasPrice ? newGasPrice : minNewGasPrice

      // Create replacement transaction
      const replacementTx = {
        to: originalTx.to,
        value: originalTx.value,
        data: newData || originalTx.data,
        gasLimit: originalTx.gasLimit,
        gasPrice: finalGasPrice,
        nonce: originalTx.nonce
      }

      // Send replacement transaction
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', this.provider)
      const newTx = await wallet.sendTransaction(replacementTx)

      // Update monitoring
      const originalTxInfo = this.pendingTransactions.get(originalHash)
      if (originalTxInfo) {
        originalTxInfo.status = 'replaced'
        this.pendingTransactions.delete(originalHash)
      }

      return {
        success: true,
        newHash: newTx.hash
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Get current network congestion level
  async getNetworkCongestion(): Promise<{
    level: 'low' | 'medium' | 'high'
    gasPrice: string
    blockUtilization: number
  }> {
    try {
      const [feeData, latestBlock] = await Promise.all([
        this.provider.getFeeData(),
        this.provider.getBlock('latest')
      ])

      const gasPrice = feeData.gasPrice || BigInt(0)
      const gasPriceGwei = Number(ethers.formatUnits(gasPrice, 'gwei'))

      // Estimate congestion based on gas price (these thresholds may need adjustment)
      let level: 'low' | 'medium' | 'high' = 'low'
      if (gasPriceGwei > 50) level = 'high'
      else if (gasPriceGwei > 20) level = 'medium'

      // Calculate block utilization
      const blockUtilization = latestBlock 
        ? Number(latestBlock.gasUsed) / Number(latestBlock.gasLimit) * 100
        : 0

      return {
        level,
        gasPrice: gasPriceGwei.toFixed(2),
        blockUtilization
      }
    } catch (error) {
      console.error('Failed to get network congestion:', error)
      return {
        level: 'medium',
        gasPrice: '0',
        blockUtilization: 0
      }
    }
  }
}

export default TransactionMonitor