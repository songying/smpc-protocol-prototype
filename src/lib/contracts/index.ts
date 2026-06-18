// Contract interaction utilities for SMPC Protocol
import { ethers } from 'ethers';
import deploymentData from '../../../deployments/deployment-1337.json';

// Contract ABIs - Import from compiled contracts
import DataRegistryABI from '../../../artifacts/contracts/DataRegistry.sol/DataRegistry.json';
import FeeManagementABI from '../../../artifacts/contracts/FeeManagement.sol/FeeManagement.json';
import ApprovalManagerABI from '../../../artifacts/contracts/ApprovalManager.sol/ApprovalManager.json';
import PrivacyComplianceABI from '../../../artifacts/contracts/PrivacyCompliance.sol/PrivacyCompliance.json';
import ComputingRequestABI from '../../../artifacts/contracts/ComputingRequest.sol/ComputingRequest.json';

// Contract addresses from deployment
export const CONTRACT_ADDRESSES = deploymentData.contracts;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: parseInt(deploymentData.chainId),
  chainName: 'Local Ganache',
  rpcUrl: 'http://127.0.0.1:8545',
  blockExplorer: 'http://127.0.0.1:8545'
};

// Contract ABIs
export const CONTRACT_ABIS = {
  DataRegistry: DataRegistryABI.abi,
  FeeManagement: FeeManagementABI.abi,
  ApprovalManager: ApprovalManagerABI.abi,
  PrivacyCompliance: PrivacyComplianceABI.abi,
  ComputingRequest: ComputingRequestABI.abi
};

// Contract instance factory
export class ContractFactory {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // Get DataRegistry contract instance
  getDataRegistry(readOnly: boolean = false) {
    return new ethers.Contract(
      CONTRACT_ADDRESSES.DataRegistry.address,
      CONTRACT_ABIS.DataRegistry,
      readOnly ? this.provider : this.signer || this.provider
    );
  }

  // Get FeeManagement contract instance
  getFeeManagement(readOnly: boolean = false) {
    return new ethers.Contract(
      CONTRACT_ADDRESSES.FeeManagement.address,
      CONTRACT_ABIS.FeeManagement,
      readOnly ? this.provider : this.signer || this.provider
    );
  }

  // Get ApprovalManager contract instance
  getApprovalManager(readOnly: boolean = false) {
    return new ethers.Contract(
      CONTRACT_ADDRESSES.ApprovalManager.address,
      CONTRACT_ABIS.ApprovalManager,
      readOnly ? this.provider : this.signer || this.provider
    );
  }

  // Get PrivacyCompliance contract instance
  getPrivacyCompliance(readOnly: boolean = false) {
    return new ethers.Contract(
      CONTRACT_ADDRESSES.PrivacyCompliance.address,
      CONTRACT_ABIS.PrivacyCompliance,
      readOnly ? this.provider : this.signer || this.provider
    );
  }

  // Get ComputingRequest contract instance
  getComputingRequest(readOnly: boolean = false) {
    return new ethers.Contract(
      CONTRACT_ADDRESSES.ComputingRequest.address,
      CONTRACT_ABIS.ComputingRequest,
      readOnly ? this.provider : this.signer || this.provider
    );
  }

  // Get all contracts
  getAllContracts(readOnly: boolean = false) {
    return {
      dataRegistry: this.getDataRegistry(readOnly),
      feeManagement: this.getFeeManagement(readOnly),
      approvalManager: this.getApprovalManager(readOnly),
      privacyCompliance: this.getPrivacyCompliance(readOnly),
      computingRequest: this.getComputingRequest(readOnly)
    };
  }
}

// Helper function to get provider
export async function getProvider(): Promise<ethers.Provider> {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  } else {
    // Fallback to JSON-RPC provider for server-side
    return new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
  }
}

// Helper function to get signer
export async function getSigner(): Promise<ethers.Signer | null> {
  if (typeof window !== 'undefined' && window.ethereum) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    return await provider.getSigner();
  }
  return null;
}

// MetaMask connection helper
export async function connectMetaMask(): Promise<string | null> {
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      // Switch to local network if not already connected
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ethers.toQuantity(NETWORK_CONFIG.chainId) }],
        });
      } catch (switchError: any) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: ethers.toQuantity(NETWORK_CONFIG.chainId),
              chainName: NETWORK_CONFIG.chainName,
              rpcUrls: [NETWORK_CONFIG.rpcUrl],
            }],
          });
        } else {
          throw switchError;
        }
      }
      
      return accounts[0];
    } catch (error) {
      console.error('Failed to connect MetaMask:', error);
      return null;
    }
  } else {
    console.error('MetaMask not detected');
    return null;
  }
}

// Contract event listeners
export class ContractEventManager {
  private contracts: ReturnType<ContractFactory['getAllContracts']>;

  constructor(contracts: ReturnType<ContractFactory['getAllContracts']>) {
    this.contracts = contracts;
  }

  // Listen to DataRegistry events
  onDataRegistered(callback: (event: any) => void) {
    this.contracts.dataRegistry.on('DataRegistered', callback);
  }

  onDataUpdated(callback: (event: any) => void) {
    this.contracts.dataRegistry.on('DataUpdated', callback);
  }

  // Listen to ComputingRequest events
  onRequestSubmitted(callback: (event: any) => void) {
    this.contracts.computingRequest.on('RequestSubmitted', callback);
  }

  onRequestApproved(callback: (event: any) => void) {
    this.contracts.computingRequest.on('RequestApproved', callback);
  }

  onComputingCompleted(callback: (event: any) => void) {
    this.contracts.computingRequest.on('ComputingCompleted', callback);
  }

  // Listen to FeeManagement events
  onFeesCalculated(callback: (event: any) => void) {
    this.contracts.feeManagement.on('FeesCalculated', callback);
  }

  onFeesDistributed(callback: (event: any) => void) {
    this.contracts.feeManagement.on('FeesDistributed', callback);
  }

  // Listen to ApprovalManager events
  onApprovalRequestCreated(callback: (event: any) => void) {
    this.contracts.approvalManager.on('ApprovalRequestCreated', callback);
  }

  onApprovalGiven(callback: (event: any) => void) {
    this.contracts.approvalManager.on('ApprovalGiven', callback);
  }

  // Remove all listeners
  removeAllListeners() {
    Object.values(this.contracts).forEach(contract => {
      contract.removeAllListeners();
    });
  }
}

// Export types for TypeScript support
export type ContractInstances = ReturnType<ContractFactory['getAllContracts']>;

// Utility function to format contract addresses for display
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Utility function to format ethers values
export function formatEther(value: bigint): string {
  return ethers.formatEther(value);
}

export function parseEther(value: string): bigint {
  return ethers.parseEther(value);
}