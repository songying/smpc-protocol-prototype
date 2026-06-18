import { ethers, Contract, Signer } from 'ethers'
import { JsonRpcProvider, BrowserProvider } from 'ethers'

// Contract ABIs (will be populated from deployment artifacts)
interface ContractABIs {
  DataRegistry: any[]
  ComputingRequest: any[]
  FeeManagement: any[]
  PrivacyCompliance: any[]
  ApprovalManager: any[]
}

// Contract addresses by network
interface NetworkConfig {
  name: string
  chainId: number
  rpcUrl: string
  contracts: Record<string, string>
}

interface ContractClientConfig {
  network: string
  providerUrl?: string
  privateKey?: string
  contracts: Record<string, string>
  abis: ContractABIs
}

export class ContractClient {
  private provider: JsonRpcProvider | BrowserProvider
  private signer?: Signer
  private contracts: Map<string, Contract> = new Map()
  private config: ContractClientConfig

  constructor(config: ContractClientConfig) {
    this.config = config
    
    // Initialize provider
    if (typeof window !== 'undefined' && window.ethereum) {
      // Browser environment with MetaMask
      this.provider = new BrowserProvider(window.ethereum)
    } else {
      // Server environment
      this.provider = new JsonRpcProvider(config.providerUrl)
    }

    // Initialize signer if private key provided
    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider)
    }

    this.initializeContracts()
  }

  private initializeContracts() {
    for (const [contractName, address] of Object.entries(this.config.contracts)) {
      if (this.config.abis[contractName as keyof ContractABIs]) {
        const contract = new Contract(
          address,
          this.config.abis[contractName as keyof ContractABIs],
          this.signer || this.provider
        )
        this.contracts.set(contractName, contract)
      }
    }
  }

  // Get contract instance
  getContract(name: string): Contract | undefined {
    return this.contracts.get(name)
  }

  // Connect to MetaMask wallet (browser only)
  async connectWallet(): Promise<Signer | null> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not available')
    }

    try {
      const provider = new BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])
      this.signer = await provider.getSigner()
      
      // Reinitialize contracts with signer
      this.initializeContracts()
      
      return this.signer
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      return null
    }
  }

  // Get current signer address
  async getSignerAddress(): Promise<string | null> {
    if (!this.signer) return null
    return await this.signer.getAddress()
  }

  // Get network information
  async getNetwork() {
    return await this.provider.getNetwork()
  }

  // Get gas price
  async getGasPrice() {
    const feeData = await this.provider.getFeeData()
    return feeData.gasPrice
  }

  // Estimate gas for a transaction
  async estimateGas(
    contractName: string,
    methodName: string,
    args: any[] = []
  ): Promise<bigint | null> {
    const contract = this.getContract(contractName)
    if (!contract) return null

    try {
      return await contract[methodName].estimateGas(...args)
    } catch (error) {
      console.error(`Gas estimation failed for ${contractName}.${methodName}:`, error)
      return null
    }
  }

  // Execute contract method with gas optimization
  async executeTransaction(
    contractName: string,
    methodName: string,
    args: any[] = [],
    options: {
      gasLimit?: bigint
      gasPrice?: bigint
      value?: bigint
    } = {}
  ) {
    const contract = this.getContract(contractName)
    if (!contract) {
      throw new Error(`Contract ${contractName} not found`)
    }

    if (!this.signer) {
      throw new Error('No signer available')
    }

    try {
      // Estimate gas if not provided
      let gasLimit = options.gasLimit
      if (!gasLimit) {
        const estimated = await this.estimateGas(contractName, methodName, args)
        if (estimated) {
          gasLimit = estimated + (estimated / BigInt(10)) // Add 10% buffer
        }
      }

      // Get current gas price if not provided
      let gasPrice = options.gasPrice
      if (!gasPrice) {
        gasPrice = await this.getGasPrice() || undefined
      }

      const txOptions: any = {
        ...(gasLimit && { gasLimit }),
        ...(gasPrice && { gasPrice }),
        ...(options.value && { value: options.value })
      }

      const tx = await contract[methodName](...args, txOptions)
      const receipt = await tx.wait()
      
      return {
        success: true,
        transactionHash: tx.hash,
        receipt,
        gasUsed: receipt.gasUsed
      }
    } catch (error) {
      console.error(`Transaction failed for ${contractName}.${methodName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Read-only contract call
  async callMethod(
    contractName: string,
    methodName: string,
    args: any[] = []
  ) {
    const contract = this.getContract(contractName)
    if (!contract) {
      throw new Error(`Contract ${contractName} not found`)
    }

    try {
      const result = await contract[methodName](...args)
      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error(`Call failed for ${contractName}.${methodName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Listen to contract events
  addEventListener(
    contractName: string,
    eventName: string,
    callback: (...args: any[]) => void,
    filter?: any[]
  ) {
    const contract = this.getContract(contractName)
    if (!contract) {
      throw new Error(`Contract ${contractName} not found`)
    }

    const eventFilter = filter ? contract.filters[eventName](...filter) : contract.filters[eventName]()
    contract.on(eventFilter, callback)

    return () => {
      contract.off(eventFilter, callback)
    }
  }

  // Get past events
  async getPastEvents(
    contractName: string,
    eventName: string,
    fromBlock: number = 0,
    toBlock: number | string = 'latest',
    filter?: any[]
  ) {
    const contract = this.getContract(contractName)
    if (!contract) {
      throw new Error(`Contract ${contractName} not found`)
    }

    try {
      const eventFilter = filter ? contract.filters[eventName](...filter) : contract.filters[eventName]()
      const events = await contract.queryFilter(eventFilter, fromBlock, toBlock)
      
      return {
        success: true,
        events: events.map(event => ({
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          args: event.args,
          event: event.eventName
        }))
      }
    } catch (error) {
      console.error(`Failed to get events for ${contractName}.${eventName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Check if user has role
  async hasRole(contractName: string, role: string, address: string): Promise<boolean> {
    const result = await this.callMethod(contractName, 'hasRole', [
      ethers.keccak256(ethers.toUtf8Bytes(role)),
      address
    ])
    
    return result.success ? result.data : false
  }

  // Get contract address
  getContractAddress(contractName: string): string | null {
    return this.config.contracts[contractName] || null
  }

  // Wait for transaction confirmation
  async waitForTransaction(txHash: string, confirmations: number = 1) {
    try {
      const receipt = await this.provider.waitForTransaction(txHash, confirmations)
      return {
        success: true,
        receipt
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Get transaction receipt
  async getTransactionReceipt(txHash: string) {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash)
      return {
        success: true,
        receipt
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Get current block number
  async getCurrentBlock(): Promise<number> {
    return await this.provider.getBlockNumber()
  }

  // Get account balance
  async getBalance(address?: string): Promise<string> {
    const addr = address || await this.getSignerAddress()
    if (!addr) throw new Error('No address provided and no signer available')
    
    const balance = await this.provider.getBalance(addr)
    return ethers.formatEther(balance)
  }

  // Update configuration
  updateConfig(newConfig: Partial<ContractClientConfig>) {
    this.config = { ...this.config, ...newConfig }
    this.initializeContracts()
  }
}

// Factory function to create client with deployment data
export async function createContractClient(
  network: string,
  deploymentDir: string = './deployments',
  providerUrl?: string,
  privateKey?: string
): Promise<ContractClient> {
  try {
    // Load deployment addresses
    const addressesPath = `${deploymentDir}/${network}-addresses.json`
    const addresses = await import(addressesPath)
    
    // Load ABIs
    const abisPath = `${deploymentDir}/${network}-abis.json`
    const abis = await import(abisPath)
    
    const config: ContractClientConfig = {
      network,
      providerUrl,
      privateKey,
      contracts: addresses.default || addresses,
      abis: abis.default || abis
    }
    
    return new ContractClient(config)
  } catch (error) {
    throw new Error(`Failed to create contract client: ${error}`)
  }
}

// Network configurations
export const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  localhost: {
    name: 'localhost',
    chainId: 1337,
    rpcUrl: 'http://127.0.0.1:8545',
    contracts: {}
  },
  sepolia: {
    name: 'sepolia',
    chainId: 11155111,
    rpcUrl: 'https://sepolia.infura.io/v3/',
    contracts: {}
  },
  mainnet: {
    name: 'mainnet',
    chainId: 1,
    rpcUrl: 'https://mainnet.infura.io/v3/',
    contracts: {}
  }
}

export default ContractClient