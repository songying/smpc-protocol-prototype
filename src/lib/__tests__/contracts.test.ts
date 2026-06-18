import { 
  ContractFactory, 
  connectMetaMask, 
  getProvider, 
  getSigner,
  formatAddress,
  formatEther,
  parseEther,
  NETWORK_CONFIG,
  CONTRACT_ADDRESSES
} from '../contracts';
import { ethers } from 'ethers';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    BrowserProvider: jest.fn(),
    JsonRpcProvider: jest.fn(),
    Contract: jest.fn(),
    formatEther: jest.fn((value) => `${value} ETH`),
    parseEther: jest.fn((value) => BigInt(value)),
    toQuantity: jest.fn((value) => `0x${value.toString(16)}`),
  }
}));

// Mock deployment data
jest.mock('../../../deployments/deployment-1337.json', () => ({
  contracts: {
    DataRegistry: { address: '0x1234567890123456789012345678901234567890' },
    FeeManagement: { address: '0x2345678901234567890123456789012345678901' },
    ApprovalManager: { address: '0x3456789012345678901234567890123456789012' },
    PrivacyCompliance: { address: '0x4567890123456789012345678901234567890123' },
    ComputingRequest: { address: '0x5678901234567890123456789012345678901234' }
  },
  chainId: '1337'
}), { virtual: true });

// Mock contract artifacts
jest.mock('../../../artifacts/contracts/DataRegistry.sol/DataRegistry.json', () => ({
  abi: [{ type: 'function', name: 'mockFunction' }]
}), { virtual: true });

jest.mock('../../../artifacts/contracts/FeeManagement.sol/FeeManagement.json', () => ({
  abi: [{ type: 'function', name: 'mockFunction' }]
}), { virtual: true });

jest.mock('../../../artifacts/contracts/ApprovalManager.sol/ApprovalManager.json', () => ({
  abi: [{ type: 'function', name: 'mockFunction' }]
}), { virtual: true });

jest.mock('../../../artifacts/contracts/PrivacyCompliance.sol/PrivacyCompliance.json', () => ({
  abi: [{ type: 'function', name: 'mockFunction' }]
}), { virtual: true });

jest.mock('../../../artifacts/contracts/ComputingRequest.sol/ComputingRequest.json', () => ({
  abi: [{ type: 'function', name: 'mockFunction' }]
}), { virtual: true });

// Mock window.ethereum
const mockEthereum = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  isMetaMask: true,
};

describe('Contract Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up window.ethereum
    Object.defineProperty(window, 'ethereum', {
      value: mockEthereum,
      writable: true,
    });
  });

  describe('Configuration', () => {
    it('should have correct network configuration', () => {
      expect(NETWORK_CONFIG.chainId).toBe(1337);
      expect(NETWORK_CONFIG.chainName).toBe('Local Ganache');
      expect(NETWORK_CONFIG.rpcUrl).toBe('http://127.0.0.1:8545');
    });

    it('should have correct contract addresses', () => {
      expect(CONTRACT_ADDRESSES.DataRegistry.address).toBe('0x1234567890123456789012345678901234567890');
      expect(CONTRACT_ADDRESSES.FeeManagement.address).toBe('0x2345678901234567890123456789012345678901');
      expect(CONTRACT_ADDRESSES.ApprovalManager.address).toBe('0x3456789012345678901234567890123456789012');
      expect(CONTRACT_ADDRESSES.PrivacyCompliance.address).toBe('0x4567890123456789012345678901234567890123');
      expect(CONTRACT_ADDRESSES.ComputingRequest.address).toBe('0x5678901234567890123456789012345678901234');
    });
  });

  describe('Provider and Signer', () => {
    it('should create browser provider when window.ethereum exists', async () => {
      const mockProvider = { getNetwork: jest.fn() };
      (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);

      const provider = await getProvider();
      
      expect(ethers.BrowserProvider).toHaveBeenCalledWith(mockEthereum);
      expect(provider).toBe(mockProvider);
    });

    it('should create JSON-RPC provider when window.ethereum does not exist', async () => {
      Object.defineProperty(window, 'ethereum', {
        value: undefined,
        writable: true,
      });

      const mockProvider = { getNetwork: jest.fn() };
      (ethers.JsonRpcProvider as jest.Mock).mockReturnValue(mockProvider);

      const provider = await getProvider();
      
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(NETWORK_CONFIG.rpcUrl);
      expect(provider).toBe(mockProvider);
    });

    it('should get signer when MetaMask is available', async () => {
      const mockSigner = { getAddress: jest.fn() };
      const mockProvider = { getSigner: jest.fn().mockResolvedValue(mockSigner) };
      (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);

      const signer = await getSigner();
      
      expect(signer).toBe(mockSigner);
    });

    it('should return null when MetaMask is not available', async () => {
      Object.defineProperty(window, 'ethereum', {
        value: undefined,
        writable: true,
      });

      const signer = await getSigner();
      
      expect(signer).toBeNull();
    });
  });

  describe('MetaMask Connection', () => {
    it('should connect to MetaMask successfully', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts) // eth_requestAccounts
        .mockResolvedValueOnce(undefined); // wallet_switchEthereumChain

      const address = await connectMetaMask();
      
      expect(address).toBe(mockAccounts[0]);
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'eth_requestAccounts',
      });
    });

    it('should add network if it does not exist', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      const networkNotFoundError = { code: 4902 };
      
      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts) // eth_requestAccounts
        .mockRejectedValueOnce(networkNotFoundError) // wallet_switchEthereumChain fails
        .mockResolvedValueOnce(undefined); // wallet_addEthereumChain

      const address = await connectMetaMask();
      
      expect(address).toBe(mockAccounts[0]);
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: ethers.toQuantity(NETWORK_CONFIG.chainId),
          chainName: NETWORK_CONFIG.chainName,
          rpcUrls: [NETWORK_CONFIG.rpcUrl],
        }],
      });
    });

    it('should return null when connection fails', async () => {
      mockEthereum.request.mockRejectedValue(new Error('User rejected'));

      const address = await connectMetaMask();
      
      expect(address).toBeNull();
    });

    it('should return null when MetaMask is not available', async () => {
      Object.defineProperty(window, 'ethereum', {
        value: undefined,
        writable: true,
      });

      const address = await connectMetaMask();
      
      expect(address).toBeNull();
    });
  });

  describe('ContractFactory', () => {
    let contractFactory: ContractFactory;
    let mockProvider: any;
    let mockSigner: any;

    beforeEach(() => {
      mockProvider = { getNetwork: jest.fn() };
      mockSigner = { getAddress: jest.fn() };
      contractFactory = new ContractFactory(mockProvider, mockSigner);
    });

    it('should create contract instances correctly', () => {
      const mockContract = { address: '0x123' };
      (ethers.Contract as jest.Mock).mockReturnValue(mockContract);

      const dataRegistry = contractFactory.getDataRegistry();
      
      expect(ethers.Contract).toHaveBeenCalledWith(
        CONTRACT_ADDRESSES.DataRegistry.address,
        mockABI,
        mockSigner
      );
      expect(dataRegistry).toBe(mockContract);
    });

    it('should create read-only contract instances', () => {
      const mockContract = { address: '0x123' };
      (ethers.Contract as jest.Mock).mockReturnValue(mockContract);

      const dataRegistry = contractFactory.getDataRegistry(true);
      
      expect(ethers.Contract).toHaveBeenCalledWith(
        CONTRACT_ADDRESSES.DataRegistry.address,
        mockABI,
        mockProvider
      );
    });

    it('should get all contracts', () => {
      const mockContract = { address: '0x123' };
      (ethers.Contract as jest.Mock).mockReturnValue(mockContract);

      const contracts = contractFactory.getAllContracts();
      
      expect(contracts).toHaveProperty('dataRegistry');
      expect(contracts).toHaveProperty('feeManagement');
      expect(contracts).toHaveProperty('approvalManager');
      expect(contracts).toHaveProperty('privacyCompliance');
      expect(contracts).toHaveProperty('computingRequest');
    });
  });

  describe('Utility Functions', () => {
    it('should format addresses correctly', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const formatted = formatAddress(address);
      
      expect(formatted).toBe('0x1234...7890');
    });

    it('should format ether values', () => {
      const value = BigInt('1000000000000000000'); // 1 ETH in wei
      const formatted = formatEther(value);
      
      expect(ethers.formatEther).toHaveBeenCalledWith(value);
      expect(formatted).toBe('1000000000000000000 ETH');
    });

    it('should parse ether values', () => {
      const value = '1.5';
      const parsed = parseEther(value);
      
      expect(ethers.parseEther).toHaveBeenCalledWith(value);
      expect(parsed).toBe(BigInt('1.5'));
    });
  });
});