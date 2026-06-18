'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { metaMask } from 'wagmi/connectors'
import { useState, useEffect } from 'react'

export function WalletConnector() {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleConnect = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Check if MetaMask is installed
      if (typeof window !== 'undefined' && !window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.')
      }
      
      connect({ connector: metaMask() })
    } catch (error: any) {
      console.error('Failed to connect wallet:', error)
      setError(error.message || 'Failed to connect to MetaMask. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (!isMounted) {
    return (
      <button
        disabled
        className="bg-blue-400 dark:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
      >
        Connect Wallet
      </button>
    )
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-4">
        <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
          Connected: {formatAddress(address)}
        </div>
        <button
          onClick={handleDisconnect}
          className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={handleConnect}
        disabled={isConnecting || isLoading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:bg-blue-500 dark:hover:bg-blue-600 dark:disabled:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
      >
        {isConnecting || isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Connecting...</span>
          </>
        ) : (
          <span>Connect Wallet</span>
        )}
      </button>
      {error && (
        <div className="mt-2 text-red-600 dark:text-red-400 text-xs max-w-xs text-right">
          {error}
        </div>
      )}
    </div>
  )
}