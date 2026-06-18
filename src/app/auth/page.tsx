'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIsAuthenticated } from '@/stores/auth-store';
import WalletConnect from '@/components/auth/WalletConnect';

export default function AuthPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSuccess = () => {
    router.push('/dashboard');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">SMPC Protocol</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex items-center justify-center min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to SMPC Protocol
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Secure Multi-Party Computation for Privacy-Preserving Data Trading
            </p>
            <div className="max-w-3xl mx-auto text-left bg-blue-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                🔐 Privacy-First Data Trading Platform
              </h3>
              <div className="grid md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">For Data Providers</h4>
                  <p className="text-blue-700">
                    Monetize your private data while maintaining complete control and privacy through advanced encryption.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">For MAS Auditors</h4>
                  <p className="text-blue-700">
                    Verify data integrity and compliance while facilitating secure multi-party computations.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">For AEP Consumers</h4>
                  <p className="text-blue-700">
                    Access and analyze private data through secure computations without exposing raw information.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-6 max-w-md mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Authentication Error</h3>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      onClick={() => setError(null)}
                      className="inline-flex text-red-400 hover:text-red-500"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Wallet connection component */}
          <WalletConnect onSuccess={handleSuccess} onError={handleError} />

          {/* Features */}
          <div className="mt-12 grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Zero-Knowledge Privacy
              </h3>
              <p className="text-gray-600">
                Advanced cryptographic protocols ensure your data remains private while enabling secure computations and verifications.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Web3 Integration
              </h3>
              <p className="text-gray-600">
                Built on blockchain technology with MetaMask integration for secure, decentralized authentication and transactions.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Smart Revenue Model
              </h3>
              <p className="text-gray-600">
                Fair and transparent revenue sharing for data providers with automated smart contract-based payments.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Compliance Ready
              </h3>
              <p className="text-gray-600">
                Built-in audit trails and compliance features meet regulatory requirements for data privacy and security.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-gray-500">
            <p>
              By connecting your wallet, you agree to our terms of service and privacy policy.
            </p>
            <p className="mt-2">
              Powered by Multi-key Fully Homomorphic Encryption (MKFHE) and Zero-Knowledge Proofs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}