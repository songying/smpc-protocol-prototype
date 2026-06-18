'use client';

import React, { useState, useEffect } from 'react';
import { connectMetaMask, NETWORK_CONFIG, formatAddress } from '../lib/contracts';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  chainId: number | null;
}

export const WalletConnection: React.FC = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isLoading: false,
    error: null,
    chainId: null,
  });

  // Early return for server-side rendering
  if (typeof window === 'undefined') {
    return (
      <div className="flex items-center space-x-2 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
        <span className="text-yellow-700">Loading wallet connection...</span>
      </div>
    );
  }

  useEffect(() => {
    // Check if already connected on mount
    checkConnection();
    
    // Set up event listeners
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  const checkConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        if (accounts.length > 0) {
          setWalletState(prev => ({
            ...prev,
            address: accounts[0],
            isConnected: true,
            chainId: parseInt(chainId, 16),
            error: null,
          }));
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };

  const handleConnect = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setWalletState(prev => ({
        ...prev,
        error: 'MetaMask not detected. Please install MetaMask to continue.',
      }));
      return;
    }

    setWalletState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const address = await connectMetaMask();
      
      if (address) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setWalletState(prev => ({
          ...prev,
          address,
          isConnected: true,
          isLoading: false,
          chainId: parseInt(chainId, 16),
          error: null,
        }));
      } else {
        setWalletState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to connect wallet. Please try again.',
        }));
      }
    } catch (error) {
      setWalletState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      }));
    }
  };

  const handleDisconnect = () => {
    setWalletState({
      address: null,
      isConnected: false,
      isLoading: false,
      error: null,
      chainId: null,
    });
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      handleDisconnect();
    } else {
      setWalletState(prev => ({
        ...prev,
        address: accounts[0],
        isConnected: true,
        error: null,
      }));
    }
  };

  const handleChainChanged = (chainId: string) => {
    const newChainId = parseInt(chainId, 16);
    setWalletState(prev => ({
      ...prev,
      chainId: newChainId,
    }));
    
    // Reload page to reset state on chain change
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const isCorrectNetwork = walletState.chainId === NETWORK_CONFIG.chainId;

  if (typeof window === 'undefined' || !window.ethereum) {
    return (
      <div className="flex items-center space-x-2 p-4 bg-red-100 border border-red-300 rounded-lg">
        <div className="text-red-700">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <span className="text-red-700 font-medium">
          MetaMask not detected. Please install MetaMask to continue.
        </span>
      </div>
    );
  }

  if (walletState.error) {
    return (
      <div className="flex items-center space-x-2 p-4 bg-red-100 border border-red-300 rounded-lg">
        <div className="text-red-700">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <span className="text-red-700 font-medium">{walletState.error}</span>
        <button
          onClick={handleConnect}
          className="ml-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!walletState.isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={walletState.isLoading}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {walletState.isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V8z" clipRule="evenodd" />
            </svg>
            <span>Connect Wallet</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {!isCorrectNetwork && (
        <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-lg">
          <div className="text-yellow-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-yellow-700 text-sm font-medium">
            Please switch to Local Ganache network
          </span>
        </div>
      )}
      
      <div className="flex items-center space-x-3 px-4 py-2 bg-green-100 border border-green-300 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-green-700 font-medium">
            {formatAddress(walletState.address!)}
          </span>
        </div>
        
        <button
          onClick={handleDisconnect}
          className="px-3 py-1 text-sm text-green-700 hover:text-green-900 border border-green-300 rounded hover:bg-green-200"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
};