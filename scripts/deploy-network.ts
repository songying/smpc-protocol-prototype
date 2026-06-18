#!/usr/bin/env node

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

interface NetworkConfig {
  name: string
  rpcUrl: string
  chainId: number
  explorerUrl: string
  gasPrice?: string
  confirmations: number
}

const NETWORKS: Record<string, NetworkConfig> = {
  localhost: {
    name: 'localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    chainId: 1337,
    explorerUrl: 'http://localhost:8545',
    confirmations: 1
  },
  sepolia: {
    name: 'sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    chainId: 11155111,
    explorerUrl: 'https://sepolia.etherscan.io',
    confirmations: 2
  },
  goerli: {
    name: 'goerli',
    rpcUrl: 'https://goerli.infura.io/v3/',
    chainId: 5,
    explorerUrl: 'https://goerli.etherscan.io',
    confirmations: 2
  },
  mainnet: {
    name: 'mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    chainId: 1,
    explorerUrl: 'https://etherscan.io',
    confirmations: 3
  }
}

class NetworkDeployer {
  private network: string
  private config: NetworkConfig
  private verify: boolean
  private gasPrice?: string

  constructor(network: string, verify: boolean = false, gasPrice?: string) {
    if (!NETWORKS[network]) {
      throw new Error(`Unsupported network: ${network}`)
    }
    
    this.network = network
    this.config = NETWORKS[network]
    this.verify = verify
    this.gasPrice = gasPrice
  }

  async deploy(): Promise<void> {
    console.log(`🚀 Starting deployment to ${this.network.toUpperCase()}...`)
    console.log(`📋 Network: ${this.config.name} (Chain ID: ${this.config.chainId})`)
    console.log(`🔗 Explorer: ${this.config.explorerUrl}`)
    console.log(`✅ Verify contracts: ${this.verify}`)
    console.log("")

    try {
      // Check prerequisites
      await this.checkPrerequisites()
      
      // Compile contracts
      await this.compileContracts()
      
      // Deploy contracts
      await this.deployContracts()
      
      // Verify contracts if requested and not localhost
      if (this.verify && this.network !== 'localhost') {
        await this.verifyContracts()
      }
      
      // Update environment file
      await this.updateEnvironmentFile()
      
      console.log("✅ Deployment completed successfully!")
      
    } catch (error) {
      console.error("❌ Deployment failed:", error)
      process.exit(1)
    }
  }

  private async checkPrerequisites(): Promise<void> {
    console.log("🔍 Checking prerequisites...")
    
    // Check if .env file exists
    const envFile = this.network === 'localhost' ? '.env.local' : '.env'
    if (!fs.existsSync(envFile)) {
      console.warn(`⚠️  ${envFile} not found. Please copy .env.example and configure it.`)
    }

    // Check if required environment variables are set
    const requiredVars = this.network === 'localhost' 
      ? ['LOCALHOST_PRIVATE_KEY']
      : [`${this.network.toUpperCase()}_RPC_URL`, `${this.network.toUpperCase()}_PRIVATE_KEY`]

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Required environment variable ${varName} is not set`)
      }
    }

    // Check if hardhat network configuration exists
    try {
      const { stdout } = await execAsync(`npx hardhat run scripts/check-network.js --network ${this.network}`)
      console.log("✅ Network configuration verified")
    } catch (error) {
      console.warn("⚠️  Network configuration check failed, but continuing...")
    }
  }

  private async compileContracts(): Promise<void> {
    console.log("🔨 Compiling contracts...")
    
    try {
      const { stdout, stderr } = await execAsync('npx hardhat compile')
      
      if (stderr && !stderr.includes('Warning')) {
        console.warn("⚠️  Compilation warnings:", stderr)
      }
      
      console.log("✅ Contracts compiled successfully")
    } catch (error) {
      throw new Error(`Contract compilation failed: ${error}`)
    }
  }

  private async deployContracts(): Promise<void> {
    console.log(`📦 Deploying contracts to ${this.network}...`)
    
    try {
      const gasFlag = this.gasPrice ? `--gas-price ${this.gasPrice}` : ''
      const { stdout, stderr } = await execAsync(
        `npx hardhat run scripts/deploy.ts --network ${this.network} ${gasFlag}`
      )
      
      console.log(stdout)
      
      if (stderr) {
        console.warn("⚠️  Deployment warnings:", stderr)
      }
      
      console.log("✅ Contracts deployed successfully")
    } catch (error) {
      throw new Error(`Contract deployment failed: ${error}`)
    }
  }

  private async verifyContracts(): Promise<void> {
    console.log("🔍 Verifying contracts on Etherscan...")
    
    try {
      // Load deployment addresses
      const deploymentFile = `./deployments/${this.network}-addresses.json`
      if (!fs.existsSync(deploymentFile)) {
        console.warn("⚠️  No deployment file found, skipping verification")
        return
      }

      const addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'))
      
      // Verify each contract
      for (const [contractName, address] of Object.entries(addresses)) {
        try {
          console.log(`   Verifying ${contractName}...`)
          
          let verifyCommand = `npx hardhat verify --network ${this.network} ${address}`
          
          // Add constructor arguments for contracts that need them
          if (contractName === 'ComputingRequest') {
            verifyCommand += ` ${addresses.DataRegistry}`
          }
          
          const { stdout } = await execAsync(verifyCommand)
          console.log(`   ✅ ${contractName} verified`)
        } catch (error) {
          console.warn(`   ⚠️  Failed to verify ${contractName}:`, error)
        }
      }
      
      console.log("✅ Contract verification completed")
    } catch (error) {
      console.warn("⚠️  Contract verification failed:", error)
    }
  }

  private async updateEnvironmentFile(): Promise<void> {
    console.log("📄 Updating environment file...")
    
    try {
      const deploymentFile = `./deployments/${this.network}-addresses.json`
      if (!fs.existsSync(deploymentFile)) {
        console.warn("⚠️  No deployment file found, skipping environment update")
        return
      }

      const addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'))
      
      // Update .env.local with deployed addresses
      const envFile = '.env.local'
      let envContent = ''
      
      if (fs.existsSync(envFile)) {
        envContent = fs.readFileSync(envFile, 'utf8')
      }
      
      // Update or add contract addresses
      const contractVars = {
        'NEXT_PUBLIC_DATA_REGISTRY_ADDRESS': addresses.DataRegistry,
        'NEXT_PUBLIC_COMPUTING_REQUEST_ADDRESS': addresses.ComputingRequest,
        'NEXT_PUBLIC_FEE_MANAGEMENT_ADDRESS': addresses.FeeManagement,
        'NEXT_PUBLIC_PRIVACY_COMPLIANCE_ADDRESS': addresses.PrivacyCompliance,
        'NEXT_PUBLIC_APPROVAL_MANAGER_ADDRESS': addresses.ApprovalManager,
        'NEXT_PUBLIC_NETWORK': this.network,
        'NEXT_PUBLIC_CHAIN_ID': this.config.chainId.toString(),
        'NEXT_PUBLIC_EXPLORER_URL': this.config.explorerUrl
      }
      
      for (const [varName, value] of Object.entries(contractVars)) {
        const regex = new RegExp(`^${varName}=.*$`, 'm')
        const newLine = `${varName}=${value}`
        
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, newLine)
        } else {
          envContent += `\n${newLine}`
        }
      }
      
      fs.writeFileSync(envFile, envContent)
      console.log(`✅ Environment file updated: ${envFile}`)
      
    } catch (error) {
      console.warn("⚠️  Failed to update environment file:", error)
    }
  }

  // Static method to show deployment status
  static async showDeploymentStatus(): Promise<void> {
    console.log("📊 Deployment Status:")
    console.log("=" + "=".repeat(50))
    
    for (const [networkName, config] of Object.entries(NETWORKS)) {
      const deploymentFile = `./deployments/${networkName}-addresses.json`
      const deploymentExists = fs.existsSync(deploymentFile)
      
      console.log(`${networkName.padEnd(12)} | ${deploymentExists ? '✅ Deployed' : '❌ Not deployed'}`)
      
      if (deploymentExists) {
        try {
          const addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'))
          console.log(`             | Contracts: ${Object.keys(addresses).length}`)
        } catch (error) {
          console.log(`             | Error reading deployment file`)
        }
      }
    }
    
    console.log("=" + "=".repeat(50))
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🚀 SMPC Protocol Network Deployment Tool

Usage:
  npm run deploy:network <network> [options]
  
Networks:
  localhost  - Local Hardhat network
  sepolia    - Sepolia testnet
  goerli     - Goerli testnet (deprecated)
  mainnet    - Ethereum mainnet

Options:
  --verify           Verify contracts on Etherscan
  --gas-price <gwei> Set custom gas price
  --status           Show deployment status for all networks
  --help, -h         Show this help message

Examples:
  npm run deploy:network localhost
  npm run deploy:network sepolia --verify
  npm run deploy:network mainnet --verify --gas-price 20
  npm run deploy:network --status

Environment Setup:
  1. Copy .env.example to .env
  2. Configure your network RPC URLs and private keys
  3. Set ETHERSCAN_API_KEY for contract verification
    `)
    return
  }
  
  if (args.includes('--status')) {
    await NetworkDeployer.showDeploymentStatus()
    return
  }
  
  const network = args[0]
  const verify = args.includes('--verify')
  const gasPriceIndex = args.indexOf('--gas-price')
  const gasPrice = gasPriceIndex !== -1 && args[gasPriceIndex + 1] 
    ? args[gasPriceIndex + 1] 
    : undefined
  
  const deployer = new NetworkDeployer(network, verify, gasPrice)
  await deployer.deploy()
}

// Helper script to check network connectivity
async function checkNetwork(network: string): Promise<void> {
  try {
    const config = NETWORKS[network]
    if (!config) {
      throw new Error(`Unknown network: ${network}`)
    }
    
    console.log(`✅ Network ${network} configuration is valid`)
  } catch (error) {
    console.error(`❌ Network check failed:`, error)
    process.exit(1)
  }
}

// Run the deployment
if (require.main === module) {
  main().catch(console.error)
}

export { NetworkDeployer, NETWORKS, checkNetwork }