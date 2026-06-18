import { renderHook, act } from '@testing-library/react';
import { ethers } from 'ethers';
import { 
  useWeb3, 
  useDataRegistry, 
  useComputingRequest, 
  useFeeManagement,
  useApprovalManager,
  usePrivacyCompliance,
  useContractEvents
} from '../hooks';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    BrowserProvider: jest.fn(),
    JsonRpcProvider: jest.fn(),
    parseEther: jest.fn(),
    formatEther: jest.fn(),
    keccak256: jest.fn(),
    toUtf8Bytes: jest.fn(),
    Contract: jest.fn()
  }
}));

// Mock window.ethereum
const mockEthereum = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn()
};

Object.defineProperty(window, 'ethereum', {
  value: mockEthereum,
  writable: true
});

describe('useWeb3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useWeb3());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBe(null);
    expect(result.current.provider).toBe(null);
    expect(result.current.signer).toBe(null);
  });

  it('should connect to wallet successfully', async () => {
    const mockProvider = {
      getNetwork: jest.fn().mockResolvedValue({ chainId: 1337n }),
      getSigner: jest.fn().mockResolvedValue({
        getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890')
      })
    };

    (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);
    mockEthereum.request.mockResolvedValue(['0x1234567890123456789012345678901234567890']);

    const { result } = renderHook(() => useWeb3());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe('0x1234567890123456789012345678901234567890');
    expect(result.current.chainId).toBe(1337);
  });

  it('should handle connection errors gracefully', async () => {
    mockEthereum.request.mockRejectedValue(new Error('User rejected request'));

    const { result } = renderHook(() => useWeb3());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toContain('User rejected request');
  });

  it('should disconnect wallet', () => {
    const { result } = renderHook(() => useWeb3());

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBe(null);
    expect(result.current.provider).toBe(null);
    expect(result.current.signer).toBe(null);
  });
});

describe('useDataRegistry', () => {
  const mockContract = {
    registerData: jest.fn(),
    getDataEntry: jest.fn(),
    getProviderData: jest.fn(),
    changeDataStatus: jest.fn(),
    wait: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ethers.Contract as jest.Mock).mockReturnValue(mockContract);
  });

  it('should register data successfully', async () => {
    const mockReceipt = { transactionHash: '0xabcd', blockNumber: 123 };
    mockContract.registerData.mockResolvedValue({ wait: () => Promise.resolve(mockReceipt) });

    const { result } = renderHook(() => useDataRegistry());

    await act(async () => {
      const receipt = await result.current.registerData(
        '0x1234567890abcdef',
        'ipfs://QmTest',
        '1.0',
        0,
        ['test'],
        true,
        1024n
      );
      expect(receipt).toEqual(mockReceipt);
    });

    expect(mockContract.registerData).toHaveBeenCalledWith(
      '0x1234567890abcdef',
      'ipfs://QmTest',
      undefined, // parseEther mock
      0,
      ['test'],
      true,
      1024n
    );
  });

  it('should retrieve data entry', async () => {
    const mockDataEntry = {
      dataHash: '0x1234567890abcdef',
      provider: '0x9876543210fedcba',
      metadataURI: 'ipfs://QmTest',
      price: 1000000000000000000n,
      category: 0,
      tags: ['test'],
      isEncrypted: true,
      dataSize: 1024n,
      status: 1,
      accessCount: 5n,
      createdAt: 1640995200n,
      updatedAt: 1640995200n
    };

    mockContract.getDataEntry.mockResolvedValue(mockDataEntry);

    const { result } = renderHook(() => useDataRegistry());

    await act(async () => {
      const dataEntry = await result.current.getDataEntry('0x1234567890abcdef');
      expect(dataEntry).toEqual(mockDataEntry);
    });

    expect(mockContract.getDataEntry).toHaveBeenCalledWith('0x1234567890abcdef');
  });

  it('should handle data registration errors', async () => {
    mockContract.registerData.mockRejectedValue(new Error('Insufficient gas'));

    const { result } = renderHook(() => useDataRegistry());

    await act(async () => {
      try {
        await result.current.registerData(
          '0x1234567890abcdef',
          'ipfs://QmTest',
          '1.0',
          0,
          ['test'],
          true,
          1024n
        );
      } catch (error) {
        expect(error.message).toBe('Insufficient gas');
      }
    });

    expect(result.current.error).toContain('Insufficient gas');
  });
});

describe('useComputingRequest', () => {
  const mockContract = {
    createRequest: jest.fn(),
    getRequest: jest.fn(),
    getConsumerRequests: jest.fn(),
    submitResult: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ethers.Contract as jest.Mock).mockReturnValue(mockContract);
  });

  it('should create computing request successfully', async () => {
    const mockReceipt = { transactionHash: '0xabcd', blockNumber: 123 };
    mockContract.createRequest.mockResolvedValue({ wait: () => Promise.resolve(mockReceipt) });

    const { result } = renderHook(() => useComputingRequest());

    await act(async () => {
      const receipt = await result.current.createRequest(
        ['0x1234567890abcdef'],
        'def compute(data): return data',
        '2.0'
      );
      expect(receipt).toEqual(mockReceipt);
    });

    expect(mockContract.createRequest).toHaveBeenCalledWith(
      ['0x1234567890abcdef'],
      'def compute(data): return data',
      undefined, // parseEther mock
      { value: undefined } // parseEther mock
    );
  });

  it('should retrieve computing request', async () => {
    const mockRequest = {
      id: 1n,
      consumer: '0x1234567890abcdef',
      dataHashes: ['0xabcdef1234567890'],
      computingScript: 'def compute(data): return data',
      budget: 2000000000000000000n,
      status: 1,
      assignedProvider: '0x9876543210fedcba',
      resultHash: '',
      paymentProcessed: false,
      createdAt: 1640995200n,
      completedAt: 0n
    };

    mockContract.getRequest.mockResolvedValue(mockRequest);

    const { result } = renderHook(() => useComputingRequest());

    await act(async () => {
      const request = await result.current.getRequest(1n);
      expect(request).toEqual(mockRequest);
    });

    expect(mockContract.getRequest).toHaveBeenCalledWith(1n);
  });

  it('should submit result successfully', async () => {
    const mockReceipt = { transactionHash: '0xabcd', blockNumber: 123 };
    mockContract.submitResult.mockResolvedValue({ wait: () => Promise.resolve(mockReceipt) });

    const { result } = renderHook(() => useComputingRequest());

    await act(async () => {
      const receipt = await result.current.submitResult(1n, '0xresulthash');
      expect(receipt).toEqual(mockReceipt);
    });

    expect(mockContract.submitResult).toHaveBeenCalledWith(1n, '0xresulthash');
  });
});

describe('useFeeManagement', () => {
  const mockContract = {
    calculateFees: jest.fn(),
    getUserBalance: jest.fn(),
    withdrawBalance: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ethers.Contract as jest.Mock).mockReturnValue(mockContract);
  });

  it('should calculate fees correctly', async () => {
    const mockFees = {
      platformFee: 100000000000000000n,
      providerFee: 1800000000000000000n,
      auditorFee: 100000000000000000n,
      totalFees: 2000000000000000000n
    };

    mockContract.calculateFees.mockResolvedValue(mockFees);

    const { result } = renderHook(() => useFeeManagement());

    await act(async () => {
      const fees = await result.current.calculateFees('2.0');
      expect(fees).toEqual(mockFees);
    });

    expect(mockContract.calculateFees).toHaveBeenCalledWith(undefined); // parseEther mock
  });

  it('should get user balance', async () => {
    mockContract.getUserBalance.mockResolvedValue(1000000000000000000n);

    const { result } = renderHook(() => useFeeManagement());

    await act(async () => {
      const balance = await result.current.getUserBalance('0x1234567890abcdef');
      expect(balance).toBe(1000000000000000000n);
    });

    expect(mockContract.getUserBalance).toHaveBeenCalledWith('0x1234567890abcdef');
  });

  it('should withdraw balance successfully', async () => {
    const mockReceipt = { transactionHash: '0xabcd', blockNumber: 123 };
    mockContract.withdrawBalance.mockResolvedValue({ wait: () => Promise.resolve(mockReceipt) });

    const { result } = renderHook(() => useFeeManagement());

    await act(async () => {
      const receipt = await result.current.withdrawBalance('1.0');
      expect(receipt).toEqual(mockReceipt);
    });

    expect(mockContract.withdrawBalance).toHaveBeenCalledWith(undefined); // parseEther mock
  });
});

describe('useApprovalManager', () => {
  const mockContract = {
    createApprovalRequest: jest.fn(),
    approveRequest: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ethers.Contract as jest.Mock).mockReturnValue(mockContract);
  });

  it('should create approval request successfully', async () => {
    const mockReceipt = { transactionHash: '0xabcd', blockNumber: 123 };
    mockContract.createApprovalRequest.mockResolvedValue({ wait: () => Promise.resolve(mockReceipt) });

    const { result } = renderHook(() => useApprovalManager());

    await act(async () => {
      const receipt = await result.current.createApprovalRequest(
        0,
        '0x1234567890abcdef',
        'Data access request',
        '{"purpose": "research"}'
      );
      expect(receipt).toEqual(mockReceipt);
    });

    expect(mockContract.createApprovalRequest).toHaveBeenCalledWith(
      0,
      '0x1234567890abcdef',
      'Data access request',
      '{"purpose": "research"}'
    );
  });

  it('should approve request successfully', async () => {
    const mockReceipt = { transactionHash: '0xabcd', blockNumber: 123 };
    mockContract.approveRequest.mockResolvedValue({ wait: () => Promise.resolve(mockReceipt) });

    const { result } = renderHook(() => useApprovalManager());

    await act(async () => {
      const receipt = await result.current.approveRequest(1n);
      expect(receipt).toEqual(mockReceipt);
    });

    expect(mockContract.approveRequest).toHaveBeenCalledWith(1n);
  });
});

describe('usePrivacyCompliance', () => {
  const mockContract = {
    createPrivacyPolicy: jest.fn(),
    acknowledgePrivacyPolicy: jest.fn(),
    submitDataSubjectRequest: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ethers.Contract as jest.Mock).mockReturnValue(mockContract);
  });

  it('should create privacy policy successfully', async () => {
    const mockReceipt = { transactionHash: '0xabcd', blockNumber: 123 };
    mockContract.createPrivacyPolicy.mockResolvedValue({ wait: () => Promise.resolve(mockReceipt) });

    const { result } = renderHook(() => usePrivacyCompliance());

    await act(async () => {
      const receipt = await result.current.createPrivacyPolicy(
        'GDPR Policy',
        '1.0',
        'ipfs://QmPrivacyPolicy',
        '0xpolicyhash',
        0,
        1640995200,
        1672531200
      );
      expect(receipt).toEqual(mockReceipt);
    });

    expect(mockContract.createPrivacyPolicy).toHaveBeenCalledWith(
      'GDPR Policy',
      '1.0',
      'ipfs://QmPrivacyPolicy',
      '0xpolicyhash',
      0,
      1640995200,
      1672531200
    );
  });

  it('should acknowledge privacy policy successfully', async () => {
    const mockReceipt = { transactionHash: '0xabcd', blockNumber: 123 };
    mockContract.acknowledgePrivacyPolicy.mockResolvedValue({ wait: () => Promise.resolve(mockReceipt) });

    const { result } = renderHook(() => usePrivacyCompliance());

    await act(async () => {
      const receipt = await result.current.acknowledgePrivacyPolicy('0xpolicyid');
      expect(receipt).toEqual(mockReceipt);
    });

    expect(mockContract.acknowledgePrivacyPolicy).toHaveBeenCalledWith('0xpolicyid');
  });

  it('should submit data subject request successfully', async () => {
    const mockReceipt = { transactionHash: '0xabcd', blockNumber: 123 };
    mockContract.submitDataSubjectRequest.mockResolvedValue({ wait: () => Promise.resolve(mockReceipt) });

    const { result } = renderHook(() => usePrivacyCompliance());

    await act(async () => {
      const receipt = await result.current.submitDataSubjectRequest(
        0, // Access request
        'Request access to my data',
        ['0x1234567890abcdef'],
        'Need data for verification',
        false
      );
      expect(receipt).toEqual(mockReceipt);
    });

    expect(mockContract.submitDataSubjectRequest).toHaveBeenCalledWith(
      0,
      'Request access to my data',
      ['0x1234567890abcdef'],
      'Need data for verification',
      false
    );
  });
});

describe('useContractEvents', () => {
  const mockEventManager = {
    onDataRegistered: jest.fn(),
    onRequestSubmitted: jest.fn(),
    onComputingCompleted: jest.fn(),
    onFeesDistributed: jest.fn(),
    onApprovalGiven: jest.fn(),
    removeAllListeners: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start listening to events', () => {
    const { result } = renderHook(() => useContractEvents());

    act(() => {
      result.current.startListening();
    });

    expect(result.current.isListening).toBe(true);
  });

  it('should stop listening to events', () => {
    const { result } = renderHook(() => useContractEvents());

    act(() => {
      result.current.startListening();
    });

    act(() => {
      result.current.stopListening();
    });

    expect(result.current.isListening).toBe(false);
  });

  it('should clear events', () => {
    const { result } = renderHook(() => useContractEvents());

    act(() => {
      result.current.clearEvents();
    });

    expect(result.current.events).toEqual([]);
  });
});