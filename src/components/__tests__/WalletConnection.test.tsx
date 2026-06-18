import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WalletConnection } from '../WalletConnection';

// Mock the contract utilities
jest.mock('../../lib/contracts', () => ({
  connectMetaMask: jest.fn(),
  getProvider: jest.fn(),
  getSigner: jest.fn(),
  NETWORK_CONFIG: {
    chainId: 1337,
    chainName: 'Local Ganache',
    rpcUrl: 'http://127.0.0.1:8545'
  }
}));

// Mock MetaMask
const mockEthereum = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  isMetaMask: true,
};

// Mock window.ethereum
Object.defineProperty(window, 'ethereum', {
  value: mockEthereum,
  writable: true,
});

describe('WalletConnection Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders connect button when not connected', () => {
    render(<WalletConnection />);
    
    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    expect(connectButton).toBeInTheDocument();
  });

  it('displays wallet address when connected', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const { connectMetaMask } = require('../../lib/contracts');
    connectMetaMask.mockResolvedValue(mockAddress);

    render(<WalletConnection />);
    
    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getByText(/0x1234...7890/)).toBeInTheDocument();
    });
  });

  it('shows error message when connection fails', async () => {
    const { connectMetaMask } = require('../../lib/contracts');
    connectMetaMask.mockResolvedValue(null);

    render(<WalletConnection />);
    
    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to connect wallet/i)).toBeInTheDocument();
    });
  });

  it('shows MetaMask not detected message when MetaMask is not available', () => {
    // Temporarily remove MetaMask
    Object.defineProperty(window, 'ethereum', {
      value: undefined,
      writable: true,
    });

    render(<WalletConnection />);
    
    expect(screen.getByText(/metamask not detected/i)).toBeInTheDocument();

    // Restore MetaMask for other tests
    Object.defineProperty(window, 'ethereum', {
      value: mockEthereum,
      writable: true,
    });
  });

  it('displays loading state during connection', async () => {
    const { connectMetaMask } = require('../../lib/contracts');
    connectMetaMask.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('0x123'), 1000)));

    render(<WalletConnection />);
    
    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    fireEvent.click(connectButton);

    // Check for loading state
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    
    // Wait for connection to complete
    await waitFor(() => {
      expect(screen.getByText(/0x123/)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('allows disconnection when connected', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const { connectMetaMask } = require('../../lib/contracts');
    connectMetaMask.mockResolvedValue(mockAddress);

    render(<WalletConnection />);
    
    // Connect first
    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getByText(/0x1234...7890/)).toBeInTheDocument();
    });

    // Now disconnect
    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
    });
  });

  it('handles account change events', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const { connectMetaMask } = require('../../lib/contracts');
    connectMetaMask.mockResolvedValue(mockAddress);

    render(<WalletConnection />);
    
    // Connect wallet
    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getByText(/0x1234...7890/)).toBeInTheDocument();
    });

    // Simulate account change
    const accountsChangedCallback = mockEthereum.on.mock.calls.find(call => call[0] === 'accountsChanged')[1];
    accountsChangedCallback(['0x9876543210987654321098765432109876543210']);

    await waitFor(() => {
      expect(screen.getByText(/0x9876...3210/)).toBeInTheDocument();
    });
  });

  it('handles chain change events', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const { connectMetaMask } = require('../../lib/contracts');
    connectMetaMask.mockResolvedValue(mockAddress);

    render(<WalletConnection />);
    
    // Connect wallet
    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getByText(/0x1234...7890/)).toBeInTheDocument();
    });

    // Simulate chain change
    const chainChangedCallback = mockEthereum.on.mock.calls.find(call => call[0] === 'chainChanged')[1];
    chainChangedCallback('0x1'); // Ethereum mainnet

    // Should show network mismatch warning
    await waitFor(() => {
      expect(screen.getByText(/please switch to local ganache/i)).toBeInTheDocument();
    });
  });
});