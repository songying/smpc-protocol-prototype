'use client';

import { useState, useEffect } from 'react';
import { useAuthActions } from '@/stores/auth-store';
import { web3Service } from '@/lib/web3';

interface WalletConnectProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function WalletConnect({ onSuccess, onError }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [step, setStep] = useState<'connect' | 'sign' | 'role'>('connect');
  const [walletData, setWalletData] = useState<{ address: string; chainId: number } | null>(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  
  const { login, selectRole } = useAuthActions();

  useEffect(() => {
    // Check if MetaMask is installed
    const checkMetaMask = async () => {
      const hasProvider = await web3Service.detectProvider();
      setIsMetaMaskInstalled(hasProvider);
    };
    
    checkMetaMask();
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    setStep('connect');
    
    try {
      if (!isMetaMaskInstalled) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Connect to MetaMask
      setStep('sign');
      const { address, chainId } = await web3Service.connectWallet();
      setWalletData({ address, chainId });
      
      // Generate nonce and message for signing
      const nonce = web3Service.generateNonce();
      const message = web3Service.generateAuthMessage(address, nonce);
      
      // Request signature from MetaMask
      const signature = await web3Service.signMessage(message);
      
      // Verify signature
      const isValid = web3Service.verifySignature(message, signature, address);
      if (!isValid) {
        throw new Error('Invalid signature. Please try again.');
      }
      
      // Authenticate user
      await login(address, signature, message, nonce);
      
      setIsConnecting(false);
      setIsConnected(true);
      setStep('role');
    } catch (error: any) {
      setIsConnecting(false);
      setStep('connect');
      onError?.(error.message || 'Connection failed');
    }
  };

  const handleRoleSelect = async (role: string) => {
    try {
      setSelectedRole(role);
      await selectRole(role, walletData?.chainId || 1);
      onSuccess?.();
    } catch (error: any) {
      onError?.(error.message || 'Role selection failed');
    }
  };

  if (isConnected && !selectedRole) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Select Your Role</h3>
          <p className="text-gray-600">
            Choose your role in the SMPC Protocol ecosystem.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {[
            {
              id: 'data-provider',
              name: 'Data Provider',
              description: 'Upload and monetize your private data while maintaining full control and privacy.',
            },
            {
              id: 'auditor',
              name: 'MAS Auditor',
              description: 'Verify data integrity, compliance, and facilitate secure multi-party computations.',
            },
            {
              id: 'data-consumer',
              name: 'AEP Consumer',
              description: 'Access and analyze private data through secure computations without exposing raw data.',
            },
          ].map((role) => (
            <div
              key={role.id}
              onClick={() => handleRoleSelect(role.id)}
              className="p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
            >
              <h4 className="font-medium text-gray-900">{role.name}</h4>
              <p className="text-sm mt-1 text-gray-600">{role.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {step === 'connect' && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600 mb-6">
              Connect your MetaMask wallet to access the SMPC Protocol platform.
            </p>
            {!isMetaMaskInstalled ? (
              <div className="text-center">
                <p className="text-red-600 mb-4">MetaMask is not installed</p>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Install MetaMask
                </a>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
              </button>
            )}
          </>
        )}

        {step === 'sign' && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sign Authentication Message
            </h3>
            <p className="text-gray-600 mb-6">
              Please sign the authentication message in your MetaMask wallet to verify your identity and complete the login process.
            </p>
            {walletData && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  <strong>Wallet:</strong> {walletData.address.slice(0, 6)}...{walletData.address.slice(-4)}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Network:</strong> {walletData.chainId === 1 ? 'Ethereum Mainnet' : `Chain ${walletData.chainId}`}
                </p>
              </div>
            )}
            <div className="flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-2 text-blue-600">
                Waiting for signature...
              </span>
            </div>
          </>
        )}

        <p className="text-xs text-gray-500 mt-4">
          Real MetaMask integration - requires MetaMask browser extension
        </p>
      </div>
    </div>
  );
}