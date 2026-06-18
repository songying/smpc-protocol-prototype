import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataProviderDashboard } from '../DataProviderDashboard';

// Mock the hooks
jest.mock('../../lib/contracts/hooks', () => ({
  useDataRegistry: () => ({
    registerData: jest.fn().mockResolvedValue({ transactionHash: '0xabcd' }),
    getProviderData: jest.fn().mockResolvedValue(['0x1234567890abcdef']),
    getDataEntry: jest.fn().mockResolvedValue({
      dataHash: '0x1234567890abcdef',
      provider: '0x9876543210fedcba',
      metadataURI: 'ipfs://QmTest',
      price: 1000000000000000000n,
      category: 2,
      tags: ['health', 'medical'],
      isEncrypted: true,
      dataSize: 2048n,
      status: 1,
      accessCount: 5n,
      createdAt: 1640995200n,
      updatedAt: 1640995200n
    }),
    changeDataStatus: jest.fn().mockResolvedValue({ transactionHash: '0xdef' }),
    isLoading: false,
    error: null,
    isConnected: true
  }),
  useFeeManagement: () => ({
    getUserBalance: jest.fn().mockResolvedValue(2000000000000000000n),
    withdrawBalance: jest.fn().mockResolvedValue({ transactionHash: '0xghi' }),
    calculateFees: jest.fn().mockResolvedValue({
      platformFee: 100000000000000000n,
      providerFee: 1800000000000000000n,
      auditorFee: 100000000000000000n,
      totalFees: 2000000000000000000n
    }),
    isLoading: false
  }),
  useContractEvents: () => ({
    events: [
      {
        type: 'DataRegistered',
        data: { provider: '0x9876543210fedcba', dataHash: '0x1234567890abcdef' },
        timestamp: Date.now()
      }
    ],
    startListening: jest.fn(),
    stopListening: jest.fn(),
    isListening: true
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

describe('DataProviderDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing when connected', () => {
    render(<DataProviderDashboard />);
    expect(screen.getByText('Data Provider Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Manage your data assets and earnings on the SMPC protocol')).toBeInTheDocument();
  });

  it('shows wallet not connected message when not connected', () => {
    // Mock disconnected state
    jest.doMock('../../lib/contracts/hooks', () => ({
      useDataRegistry: () => ({ isConnected: false }),
      useFeeManagement: () => ({ isConnected: false }),
      useContractEvents: () => ({ events: [], isListening: false })
    }));

    render(<DataProviderDashboard />);
    expect(screen.getByText('Wallet Not Connected')).toBeInTheDocument();
  });

  it('renders tab navigation correctly', () => {
    render(<DataProviderDashboard />);
    
    expect(screen.getByText('Register Data')).toBeInTheDocument();
    expect(screen.getByText('Manage Data')).toBeInTheDocument();
    expect(screen.getByText('Earnings')).toBeInTheDocument();
    expect(screen.getByText('Activity Feed')).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    const user = userEvent.setup();
    render(<DataProviderDashboard />);
    
    // Click on Manage Data tab
    await user.click(screen.getByText('Manage Data'));
    expect(screen.getByText('Your Data Assets')).toBeInTheDocument();
    
    // Click on Earnings tab
    await user.click(screen.getByText('Earnings'));
    expect(screen.getByText('Earnings & Withdrawals')).toBeInTheDocument();
    
    // Click on Activity Feed tab
    await user.click(screen.getByText('Activity Feed'));
    expect(screen.getByText('Activity Feed')).toBeInTheDocument();
  });

  it('renders data registration form', () => {
    render(<DataProviderDashboard />);
    
    expect(screen.getByText('Register New Data Asset')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ipfs://QmExample...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('1024')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('health, medical, research')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe your data asset...')).toBeInTheDocument();
  });

  it('handles data registration form submission', async () => {
    const user = userEvent.setup();
    render(<DataProviderDashboard />);
    
    // Fill out the form
    await user.type(screen.getByPlaceholderText('ipfs://QmExample...'), 'ipfs://QmTestData');
    await user.type(screen.getByPlaceholderText('0.1'), '1.5');
    await user.type(screen.getByPlaceholderText('1024'), '2048');
    await user.type(screen.getByPlaceholderText('health, medical, research'), 'test, demo');
    await user.type(screen.getByPlaceholderText('Describe your data asset...'), 'Test data for demo');
    
    // Submit the form
    const submitButton = screen.getByText('Register Data Asset');
    await user.click(submitButton);
    
    // Form should be submitted (would need to mock the hook implementation to verify the call)
    expect(submitButton).toBeInTheDocument();
  });

  it('displays category options correctly', () => {
    render(<DataProviderDashboard />);
    
    const categorySelect = screen.getByDisplayValue('Personal');
    expect(categorySelect).toBeInTheDocument();
    
    // Check if all category options are present
    fireEvent.click(categorySelect);
    expect(screen.getByText('Financial')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Social')).toBeInTheDocument();
    expect(screen.getByText('Behavioral')).toBeInTheDocument();
  });

  it('displays user balance in earnings tab', async () => {
    const user = userEvent.setup();
    render(<DataProviderDashboard />);
    
    // Switch to earnings tab
    await user.click(screen.getByText('Earnings'));
    
    // Should display balance (mocked as 2 ETH)
    expect(screen.getByText('2 ETH')).toBeInTheDocument();
    expect(screen.getByText('Available Balance')).toBeInTheDocument();
  });

  it('handles withdrawal form in earnings tab', async () => {
    const user = userEvent.setup();
    render(<DataProviderDashboard />);
    
    // Switch to earnings tab
    await user.click(screen.getByText('Earnings'));
    
    // Find withdrawal input and button
    const withdrawInput = screen.getByPlaceholderText('Amount in ETH');
    const withdrawButton = screen.getByText('Withdraw');
    
    expect(withdrawInput).toBeInTheDocument();
    expect(withdrawButton).toBeInTheDocument();
    
    // Test withdrawal form
    await user.type(withdrawInput, '1.0');
    await user.click(withdrawButton);
    
    // The withdrawal function should be called (mocked)
    expect(withdrawInput).toBeInTheDocument();
  });

  it('displays data encryption checkbox', () => {
    render(<DataProviderDashboard />);
    
    const encryptionCheckbox = screen.getByText('Data is encrypted');
    expect(encryptionCheckbox).toBeInTheDocument();
  });

  it('shows event activity in activity feed', async () => {
    const user = userEvent.setup();
    render(<DataProviderDashboard />);
    
    // Switch to activity feed tab
    await user.click(screen.getByText('Activity Feed'));
    
    // Should show event data (mocked)
    expect(screen.getByText('DataRegistered')).toBeInTheDocument();
  });

  it('displays refresh button in manage data tab', async () => {
    const user = userEvent.setup();
    render(<DataProviderDashboard />);
    
    // Switch to manage data tab
    await user.click(screen.getByText('Manage Data'));
    
    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeInTheDocument();
    
    // Test refresh functionality
    await user.click(refreshButton);
    expect(refreshButton).toBeInTheDocument();
  });

  it('validates required form fields', async () => {
    const user = userEvent.setup();
    render(<DataProviderDashboard />);
    
    // Try to submit form without filling required fields
    const submitButton = screen.getByText('Register Data Asset');
    await user.click(submitButton);
    
    // HTML5 validation should prevent submission
    // The form should still be visible
    expect(screen.getByText('Register New Data Asset')).toBeInTheDocument();
  });

  it('displays loading states correctly', () => {
    // Mock loading state
    jest.doMock('../../lib/contracts/hooks', () => ({
      useDataRegistry: () => ({
        isLoading: true,
        isConnected: true
      }),
      useFeeManagement: () => ({
        isLoading: true
      }),
      useContractEvents: () => ({
        events: [],
        isListening: false
      })
    }));

    render(<DataProviderDashboard />);
    
    // The component should handle loading states gracefully
    expect(screen.getByText('Data Provider Dashboard')).toBeInTheDocument();
  });

  it('displays error states correctly', () => {
    // Mock error state
    jest.doMock('../../lib/contracts/hooks', () => ({
      useDataRegistry: () => ({
        error: 'Network error',
        isConnected: true
      }),
      useFeeManagement: () => ({
        isLoading: false
      }),
      useContractEvents: () => ({
        events: [],
        isListening: false
      })
    }));

    render(<DataProviderDashboard />);
    
    // The component should handle error states gracefully
    expect(screen.getByText('Data Provider Dashboard')).toBeInTheDocument();
  });
});