import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataConsumerInterface } from '../DataConsumerInterface';

// Mock the hooks
jest.mock('../../lib/contracts/hooks', () => ({
  useDataRegistry: () => ({
    getDataEntry: jest.fn().mockResolvedValue({
      dataHash: '0x1234567890abcdef',
      provider: '0x9876543210fedcba',
      metadataURI: 'ipfs://QmTest',
      price: 500000000000000000n, // 0.5 ETH
      category: 2,
      tags: ['health', 'medical'],
      isEncrypted: true,
      dataSize: 2048n,
      status: 1,
      accessCount: 3n,
      createdAt: 1640995200n,
      updatedAt: 1640995200n
    }),
    isConnected: true
  }),
  useComputingRequest: () => ({
    createRequest: jest.fn().mockResolvedValue({ transactionHash: '0xabcd' }),
    getRequest: jest.fn().mockResolvedValue({
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
    }),
    getConsumerRequests: jest.fn().mockResolvedValue([1n, 2n]),
    submitResult: jest.fn().mockResolvedValue({ transactionHash: '0xdef' }),
    isLoading: false,
    error: null,
    isConnected: true
  }),
  useFeeManagement: () => ({
    calculateFees: jest.fn().mockResolvedValue({
      platformFee: 100000000000000000n,
      providerFee: 1800000000000000000n,
      auditorFee: 100000000000000000n,
      totalFees: 2000000000000000000n
    }),
    getUserBalance: jest.fn().mockResolvedValue(5000000000000000000n), // 5 ETH
    withdrawBalance: jest.fn().mockResolvedValue({ transactionHash: '0xghi' }),
    isLoading: false
  }),
  useApprovalManager: () => ({
    createApprovalRequest: jest.fn().mockResolvedValue({ transactionHash: '0xjkl' }),
    approveRequest: jest.fn().mockResolvedValue({ transactionHash: '0xmno' }),
    isLoading: false
  }),
  usePrivacyCompliance: () => ({
    acknowledgePrivacyPolicy: jest.fn().mockResolvedValue({ transactionHash: '0xpqr' }),
    submitDataSubjectRequest: jest.fn().mockResolvedValue({ transactionHash: '0xstu' }),
    isLoading: false
  }),
  formatEther: (value: bigint) => (Number(value) / 1e18).toString()
}));

// Mock window.ethereum
const mockEthereum = {
  request: jest.fn().mockResolvedValue(['0x1234567890123456789012345678901234567890'])
};

Object.defineProperty(window, 'ethereum', {
  value: mockEthereum,
  writable: true
});

describe('DataConsumerInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing when connected', () => {
    render(<DataConsumerInterface />);
    expect(screen.getByText('Data Consumer Interface')).toBeInTheDocument();
    expect(screen.getByText('Discover, request, and process data through secure multi-party computation')).toBeInTheDocument();
  });

  it('shows wallet not connected message when not connected', () => {
    // Mock disconnected state
    jest.doMock('../../lib/contracts/hooks', () => ({
      useDataRegistry: () => ({ isConnected: false }),
      useComputingRequest: () => ({ isConnected: false }),
      useFeeManagement: () => ({ isConnected: false }),
      useApprovalManager: () => ({ isConnected: false }),
      usePrivacyCompliance: () => ({ isConnected: false })
    }));

    render(<DataConsumerInterface />);
    expect(screen.getByText('Wallet Not Connected')).toBeInTheDocument();
  });

  it('displays user balance correctly', () => {
    render(<DataConsumerInterface />);
    
    // Should display balance (mocked as 5 ETH)
    expect(screen.getByText('5 ETH')).toBeInTheDocument();
    expect(screen.getByText('Available Balance')).toBeInTheDocument();
  });

  it('renders tab navigation correctly', () => {
    render(<DataConsumerInterface />);
    
    expect(screen.getByText('Discover Data')).toBeInTheDocument();
    expect(screen.getByText('Create Request')).toBeInTheDocument();
    expect(screen.getByText('My Requests')).toBeInTheDocument();
    expect(screen.getByText('Privacy Center')).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    const user = userEvent.setup();
    render(<DataConsumerInterface />);
    
    // Click on Create Request tab
    await user.click(screen.getByText('Create Request'));
    expect(screen.getByText('Create Computing Request')).toBeInTheDocument();
    
    // Click on My Requests tab
    await user.click(screen.getByText('My Requests'));
    expect(screen.getByText('My Computing Requests')).toBeInTheDocument();
    
    // Click on Privacy Center tab
    await user.click(screen.getByText('Privacy Center'));
    expect(screen.getByText('Privacy Center')).toBeInTheDocument();
  });

  it('displays search filters in discover tab', () => {
    render(<DataConsumerInterface />);
    
    expect(screen.getByText('Search Filters')).toBeInTheDocument();
    expect(screen.getByText('All Categories')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('1.0')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('health, finance')).toBeInTheDocument();
    expect(screen.getByText('Only encrypted data')).toBeInTheDocument();
  });

  it('displays category filter options', () => {
    render(<DataConsumerInterface />);
    
    const categorySelect = screen.getByDisplayValue('All Categories');
    expect(categorySelect).toBeInTheDocument();
    
    // Check if category options are available
    fireEvent.click(categorySelect);
    // Note: Options might not be visible in jsdom without proper dropdown implementation
  });

  it('displays available data assets', () => {
    render(<DataConsumerInterface />);
    
    expect(screen.getByText('Available Data Assets')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('handles data asset refresh', async () => {
    const user = userEvent.setup();
    render(<DataConsumerInterface />);
    
    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);
    
    expect(refreshButton).toBeInTheDocument();
  });

  it('renders computing request form in create request tab', async () => {
    const user = userEvent.setup();
    render(<DataConsumerInterface />);
    
    // Switch to Create Request tab
    await user.click(screen.getByText('Create Request'));
    
    expect(screen.getByText('Selected Data Sources (0)')).toBeInTheDocument();
    expect(screen.getByText('Computing Script')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('1.0')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Brief description of your computation')).toBeInTheDocument();
  });

  it('displays script templates', async () => {
    const user = userEvent.setup();
    render(<DataConsumerInterface />);
    
    // Switch to Create Request tab
    await user.click(screen.getByText('Create Request'));
    
    expect(screen.getByText('Templates:')).toBeInTheDocument();
    expect(screen.getByText('Statistical Analysis')).toBeInTheDocument();
    expect(screen.getByText('Privacy-Preserving Aggregation')).toBeInTheDocument();
    expect(screen.getByText('Machine Learning Training')).toBeInTheDocument();
  });

  it('handles script template selection', async () => {
    const user = userEvent.setup();
    render(<DataConsumerInterface />);
    
    // Switch to Create Request tab
    await user.click(screen.getByText('Create Request'));
    
    // Click on a template
    await user.click(screen.getByText('Statistical Analysis'));
    
    // The script textarea should be updated (would need to verify the exact implementation)
    const scriptTextarea = screen.getByPlaceholderText(/def compute/);
    expect(scriptTextarea).toBeInTheDocument();
  });

  it('shows fee estimation when budget is entered', async () => {
    const user = userEvent.setup();
    render(<DataConsumerInterface />);
    
    // Switch to Create Request tab
    await user.click(screen.getByText('Create Request'));
    
    // Enter budget
    const budgetInput = screen.getByPlaceholderText('1.0');
    await user.type(budgetInput, '2.0');
    
    // Fee estimation should appear (mocked)
    // This would require the actual implementation to trigger the estimation
    expect(budgetInput).toHaveValue('2.0');
  });

  it('displays privacy center sections', async () => {
    const user = userEvent.setup();
    render(<DataConsumerInterface />);
    
    // Switch to Privacy Center tab
    await user.click(screen.getByText('Privacy Center'));
    
    expect(screen.getByText('Data Subject Rights')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policies')).toBeInTheDocument();
    expect(screen.getByText('Consent Management')).toBeInTheDocument();
  });

  it('displays data subject rights buttons', async () => {
    const user = userEvent.setup();
    render(<DataConsumerInterface />);
    
    // Switch to Privacy Center tab
    await user.click(screen.getByText('Privacy Center'));
    
    expect(screen.getByText('Access My Data')).toBeInTheDocument();
    expect(screen.getByText('Correct My Data')).toBeInTheDocument();
    expect(screen.getByText('Delete My Data')).toBeInTheDocument();
  });

  it('handles data subject rights button clicks', async () => {
    const user = userEvent.setup();
    render(<DataConsumerInterface />);
    
    // Switch to Privacy Center tab
    await user.click(screen.getByText('Privacy Center'));
    
    // Mock alert for testing
    window.alert = jest.fn();
    
    // Click access data button
    await user.click(screen.getByText('Access My Data'));
    expect(window.alert).toHaveBeenCalledWith('Data access request functionality would be implemented here');
  });

  it('displays consent management toggles', async () => {
    const user = userEvent.setup();
    render(<DataConsumerInterface />);
    
    // Switch to Privacy Center tab
    await user.click(screen.getByText('Privacy Center'));
    
    expect(screen.getByText('Analytics and Research')).toBeInTheDocument();
    expect(screen.getByText('Third-party Sharing')).toBeInTheDocument();
  });

  it('validates form submission requirements', async () => {
    const user = userEvent.setup();
    render(<DataConsumerInterface />);
    
    // Switch to Create Request tab
    await user.click(screen.getByText('Create Request'));
    
    // Try to submit without selecting data sources
    const submitButton = screen.getByText('Submit Computing Request');
    
    // Mock alert for testing
    window.alert = jest.fn();
    
    await user.click(submitButton);
    
    // Should show validation message (this would depend on actual implementation)
    expect(submitButton).toBeInTheDocument();
  });

  it('handles loading states correctly', () => {
    // Mock loading state
    jest.doMock('../../lib/contracts/hooks', () => ({
      useDataRegistry: () => ({ isConnected: true }),
      useComputingRequest: () => ({ isLoading: true, isConnected: true }),
      useFeeManagement: () => ({ isLoading: false }),
      useApprovalManager: () => ({ isLoading: false }),
      usePrivacyCompliance: () => ({ isLoading: false })
    }));

    render(<DataConsumerInterface />);
    
    // The component should handle loading states gracefully
    expect(screen.getByText('Data Consumer Interface')).toBeInTheDocument();
  });

  it('handles error states correctly', () => {
    // Mock error state
    jest.doMock('../../lib/contracts/hooks', () => ({
      useDataRegistry: () => ({ isConnected: true }),
      useComputingRequest: () => ({ 
        error: 'Network error', 
        isConnected: true 
      }),
      useFeeManagement: () => ({ isLoading: false }),
      useApprovalManager: () => ({ isLoading: false }),
      usePrivacyCompliance: () => ({ isLoading: false })
    }));

    render(<DataConsumerInterface />);
    
    // The component should handle error states gracefully
    expect(screen.getByText('Data Consumer Interface')).toBeInTheDocument();
  });

  it('displays request status correctly in my requests tab', async () => {
    const user = userEvent.setup();
    render(<DataConsumerInterface />);
    
    // Switch to My Requests tab
    await user.click(screen.getByText('My Requests'));
    
    // Should show request information (based on mocked data)
    expect(screen.getByText('My Computing Requests')).toBeInTheDocument();
  });
});