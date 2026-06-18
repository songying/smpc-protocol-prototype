// React hooks for contract interactions
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  ContractFactory, 
  ContractEventManager, 
  getProvider, 
  getSigner,
  CONTRACT_ADDRESSES,
  parseEther
} from './index';

// Types for contract data
export interface DataEntry {
  dataHash: string;
  provider: string;
  metadataURI: string;
  price: bigint;
  category: number;
  tags: string[];
  isEncrypted: boolean;
  dataSize: bigint;
  status: number;
  accessCount: bigint;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface ComputingRequestData {
  id: bigint;
  consumer: string;
  dataHashes: string[];
  computingScript: string;
  budget: bigint;
  status: number;
  assignedProvider: string;
  resultHash: string;
  paymentProcessed: boolean;
  createdAt: bigint;
  completedAt: bigint;
}

export interface ApprovalRequestData {
  id: bigint;
  requestType: number;
  dataHash: string;
  description: string;
  metadata: string;
  requester: string;
  status: number;
  approverCount: bigint;
  requiredApprovals: bigint;
  createdAt: bigint;
  deadline: bigint;
}

export interface FeeBreakdown {
  platformFee: bigint;
  providerFee: bigint;
  auditorFee: bigint;
  totalFees: bigint;
}

// Custom hooks for contract interactions

/**
 * Hook for Web3 provider and signer management
 */
export function useWeb3() {
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const provider = await getProvider();
      const signer = await getSigner();
      
      if (signer) {
        const address = await signer.getAddress();
        const network = await provider.getNetwork();
        
        setProvider(provider);
        setSigner(signer);
        setAddress(address);
        setChainId(Number(network.chainId));
        setIsConnected(true);
      } else {
        throw new Error('Unable to get signer. Please connect your wallet.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setIsConnected(false);
    setError(null);
  }, []);

  useEffect(() => {
    // Auto-connect if MetaMask is already connected
    const autoConnect = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connect();
          }
        } catch (error) {
          console.error('Auto-connect failed:', error);
        }
      }
    };

    autoConnect();

    // Listen for account/chain changes
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          connect();
        }
      };

      const handleChainChanged = () => {
        connect(); // Reconnect on chain change
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [connect, disconnect]);

  return {
    provider,
    signer,
    address,
    chainId,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect
  };
}

/**
 * Hook for DataRegistry contract interactions
 */
export function useDataRegistry() {
  const { provider, signer, isConnected } = useWeb3();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractFactory = provider ? new ContractFactory(provider, signer || undefined) : null;
  const contract = contractFactory?.getDataRegistry();

  const registerData = useCallback(async (
    dataHash: string,
    metadataURI: string,
    price: string,
    category: number,
    tags: string[],
    isEncrypted: boolean,
    dataSize: bigint
  ) => {
    if (!contract || !signer) throw new Error('Contract not available');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const tx = await contract.registerData(
        dataHash,
        metadataURI,
        parseEther(price),
        category,
        tags,
        isEncrypted,
        dataSize
      );
      
      const receipt = await tx.wait();
      return receipt;
    } catch (err: any) {
      setError(err.message || 'Failed to register data');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, signer]);

  const getDataEntry = useCallback(async (dataHash: string): Promise<DataEntry | null> => {
    if (!contract) return null;
    
    try {
      const data = await contract.getDataEntry(dataHash);
      return {
        dataHash: data.dataHash,
        provider: data.provider,
        metadataURI: data.metadataURI,
        price: data.price,
        category: data.category,
        tags: data.tags,
        isEncrypted: data.isEncrypted,
        dataSize: data.dataSize,
        status: data.status,
        accessCount: data.accessCount,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    } catch (err) {
      console.error('Failed to get data entry:', err);
      return null;
    }
  }, [contract]);

  const getProviderData = useCallback(async (providerAddress: string): Promise<string[]> => {
    if (!contract) return [];
    
    try {
      return await contract.getProviderData(providerAddress);
    } catch (err) {
      console.error('Failed to get provider data:', err);
      return [];
    }
  }, [contract]);

  const changeDataStatus = useCallback(async (dataHash: string, newStatus: number) => {
    if (!contract || !signer) throw new Error('Contract not available');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const tx = await contract.changeDataStatus(dataHash, newStatus);
      const receipt = await tx.wait();
      return receipt;
    } catch (err: any) {
      setError(err.message || 'Failed to change data status');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, signer]);

  return {
    contract,
    isLoading,
    error,
    registerData,
    getDataEntry,
    getProviderData,
    changeDataStatus,
    isConnected
  };
}

/**
 * Hook for ComputingRequest contract interactions
 */
export function useComputingRequest() {
  const { provider, signer, isConnected } = useWeb3();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractFactory = provider ? new ContractFactory(provider, signer || undefined) : null;
  const contract = contractFactory?.getComputingRequest();

  const createRequest = useCallback(async (
    dataHashes: string[],
    computingScript: string,
    budget: string
  ) => {
    if (!contract || !signer) throw new Error('Contract not available');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const budgetWei = parseEther(budget);
      const tx = await contract.createRequest(
        dataHashes,
        computingScript,
        budgetWei,
        { value: budgetWei }
      );
      
      const receipt = await tx.wait();
      return receipt;
    } catch (err: any) {
      setError(err.message || 'Failed to create computing request');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, signer]);

  const getRequest = useCallback(async (requestId: bigint): Promise<ComputingRequestData | null> => {
    if (!contract) return null;
    
    try {
      const request = await contract.getRequest(requestId);
      return {
        id: request.id,
        consumer: request.consumer,
        dataHashes: request.dataHashes,
        computingScript: request.computingScript,
        budget: request.budget,
        status: request.status,
        assignedProvider: request.assignedProvider,
        resultHash: request.resultHash,
        paymentProcessed: request.paymentProcessed,
        createdAt: request.createdAt,
        completedAt: request.completedAt
      };
    } catch (err) {
      console.error('Failed to get request:', err);
      return null;
    }
  }, [contract]);

  const getConsumerRequests = useCallback(async (consumerAddress: string): Promise<bigint[]> => {
    if (!contract) return [];
    
    try {
      return await contract.getConsumerRequests(consumerAddress);
    } catch (err) {
      console.error('Failed to get consumer requests:', err);
      return [];
    }
  }, [contract]);

  const submitResult = useCallback(async (requestId: bigint, resultHash: string) => {
    if (!contract || !signer) throw new Error('Contract not available');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const tx = await contract.submitResult(requestId, resultHash);
      const receipt = await tx.wait();
      return receipt;
    } catch (err: any) {
      setError(err.message || 'Failed to submit result');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, signer]);

  return {
    contract,
    isLoading,
    error,
    createRequest,
    getRequest,
    getConsumerRequests,
    submitResult,
    isConnected
  };
}

/**
 * Hook for FeeManagement contract interactions
 */
export function useFeeManagement() {
  const { provider, signer, isConnected } = useWeb3();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractFactory = provider ? new ContractFactory(provider, signer || undefined) : null;
  const contract = contractFactory?.getFeeManagement();

  const calculateFees = useCallback(async (amount: string): Promise<FeeBreakdown | null> => {
    if (!contract) return null;
    
    try {
      const amountWei = parseEther(amount);
      const fees = await contract.calculateFees(amountWei);
      
      return {
        platformFee: fees.platformFee,
        providerFee: fees.providerFee,
        auditorFee: fees.auditorFee,
        totalFees: fees.totalFees
      };
    } catch (err) {
      console.error('Failed to calculate fees:', err);
      return null;
    }
  }, [contract]);

  const getUserBalance = useCallback(async (userAddress: string): Promise<bigint> => {
    if (!contract) return 0n;
    
    try {
      return await contract.getUserBalance(userAddress);
    } catch (err) {
      console.error('Failed to get user balance:', err);
      return 0n;
    }
  }, [contract]);

  const withdrawBalance = useCallback(async (amount: string) => {
    if (!contract || !signer) throw new Error('Contract not available');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const amountWei = parseEther(amount);
      const tx = await contract.withdrawBalance(amountWei);
      const receipt = await tx.wait();
      return receipt;
    } catch (err: any) {
      setError(err.message || 'Failed to withdraw balance');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, signer]);

  return {
    contract,
    isLoading,
    error,
    calculateFees,
    getUserBalance,
    withdrawBalance,
    isConnected
  };
}

/**
 * Hook for ApprovalManager contract interactions
 */
export function useApprovalManager() {
  const { provider, signer, isConnected } = useWeb3();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractFactory = provider ? new ContractFactory(provider, signer || undefined) : null;
  const contract = contractFactory?.getApprovalManager();

  const createApprovalRequest = useCallback(async (
    requestType: number,
    dataHash: string,
    description: string,
    metadata: string | Uint8Array
  ) => {
    if (!contract || !signer) throw new Error('Contract not available');
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Convert metadata to bytes if it's a string
      const metadataBytes = typeof metadata === 'string' 
        ? new TextEncoder().encode(metadata)
        : metadata;
      
      const tx = await contract.createApprovalRequest(
        requestType,
        dataHash,
        description,
        metadataBytes
      );
      
      const receipt = await tx.wait();
      return receipt;
    } catch (err: any) {
      setError(err.message || 'Failed to create approval request');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, signer]);

  const approveRequest = useCallback(async (requestId: bigint) => {
    if (!contract || !signer) throw new Error('Contract not available');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const tx = await contract.approveRequest(requestId);
      const receipt = await tx.wait();
      return receipt;
    } catch (err: any) {
      setError(err.message || 'Failed to approve request');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, signer]);

  return {
    contract,
    isLoading,
    error,
    createApprovalRequest,
    approveRequest,
    isConnected
  };
}

/**
 * Hook for PrivacyCompliance contract interactions
 */
export function usePrivacyCompliance() {
  const { provider, signer, isConnected } = useWeb3();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractFactory = provider ? new ContractFactory(provider, signer || undefined) : null;
  const contract = contractFactory?.getPrivacyCompliance();

  const createPrivacyPolicy = useCallback(async (
    title: string,
    version: string,
    contentURI: string,
    contentHash: string,
    framework: number,
    effectiveDate: number,
    expirationDate: number
  ) => {
    if (!contract || !signer) throw new Error('Contract not available');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const tx = await contract.createPrivacyPolicy(
        title,
        version,
        contentURI,
        contentHash,
        framework,
        effectiveDate,
        expirationDate
      );
      
      const receipt = await tx.wait();
      return receipt;
    } catch (err: any) {
      setError(err.message || 'Failed to create privacy policy');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, signer]);

  const acknowledgePrivacyPolicy = useCallback(async (policyId: string) => {
    if (!contract || !signer) throw new Error('Contract not available');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const tx = await contract.acknowledgePrivacyPolicy(policyId);
      const receipt = await tx.wait();
      return receipt;
    } catch (err: any) {
      setError(err.message || 'Failed to acknowledge privacy policy');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, signer]);

  const submitDataSubjectRequest = useCallback(async (
    requestType: number,
    description: string,
    affectedDataHashes: string[],
    reason: string,
    isUrgent: boolean
  ) => {
    if (!contract || !signer) throw new Error('Contract not available');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const tx = await contract.submitDataSubjectRequest(
        requestType,
        description,
        affectedDataHashes,
        reason,
        isUrgent
      );
      
      const receipt = await tx.wait();
      return receipt;
    } catch (err: any) {
      setError(err.message || 'Failed to submit data subject request');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, signer]);

  return {
    contract,
    isLoading,
    error,
    createPrivacyPolicy,
    acknowledgePrivacyPolicy,
    submitDataSubjectRequest,
    isConnected
  };
}

/**
 * Hook for real-time contract events
 */
export function useContractEvents() {
  const { provider, signer } = useWeb3();
  const [events, setEvents] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);

  const contractFactory = provider ? new ContractFactory(provider, signer || undefined) : null;
  const eventManager = contractFactory ? new ContractEventManager(contractFactory.getAllContracts(true)) : null;

  const startListening = useCallback(() => {
    if (!eventManager) return;

    setIsListening(true);

    // Listen to all relevant events
    eventManager.onDataRegistered((event) => {
      setEvents(prev => [...prev, { type: 'DataRegistered', data: event, timestamp: Date.now() }]);
    });

    eventManager.onRequestSubmitted((event) => {
      setEvents(prev => [...prev, { type: 'RequestSubmitted', data: event, timestamp: Date.now() }]);
    });

    eventManager.onComputingCompleted((event) => {
      setEvents(prev => [...prev, { type: 'ComputingCompleted', data: event, timestamp: Date.now() }]);
    });

    eventManager.onFeesDistributed((event) => {
      setEvents(prev => [...prev, { type: 'FeesDistributed', data: event, timestamp: Date.now() }]);
    });

    eventManager.onApprovalGiven((event) => {
      setEvents(prev => [...prev, { type: 'ApprovalGiven', data: event, timestamp: Date.now() }]);
    });
  }, [eventManager]);

  const stopListening = useCallback(() => {
    if (!eventManager) return;
    
    eventManager.removeAllListeners();
    setIsListening(false);
  }, [eventManager]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    return () => {
      if (eventManager) {
        eventManager.removeAllListeners();
      }
    };
  }, [eventManager]);

  return {
    events,
    isListening,
    startListening,
    stopListening,
    clearEvents
  };
}