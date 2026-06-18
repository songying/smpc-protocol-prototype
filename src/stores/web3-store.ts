// Simplified Web3 store for demo

export const useWeb3Actions = () => ({
  connect: async () => {
    console.log('Demo wallet connect');
  },
  disconnect: async () => {
    console.log('Demo wallet disconnect');
  },
  switchChain: async (chainId: number) => {
    console.log('Demo switch chain:', chainId);
  },
  signMessage: async (message: string) => {
    console.log('Demo sign message:', message);
    return 'demo_signature_0x123...';
  },
  clearError: () => {
    console.log('Demo clear Web3 error');
  },
  isMetaMaskAvailable: true,
});

export const useWalletStatus = () => ({
  isConnected: true,
  isConnecting: false,
  address: '0x1234567890123456789012345678901234567890',
  chainId: 1,
  error: null,
  hasError: false,
  isReady: true,
  isLoading: false
});

export const useWalletConnection = () => ({
  address: '0x1234567890123456789012345678901234567890',
  chainId: 1,
  isConnected: true,
  isConnecting: false,
  connector: 'MetaMask'
});

export const useIsConnected = () => true;
export const useIsConnecting = () => false;
export const useWeb3Error = () => null;
export const useWalletAddress = () => '0x1234567890123456789012345678901234567890';
export const useCurrentChainId = () => 1;
export const useFormattedAddress = () => '0x1234...7890';
export const useChainName = () => 'Ethereum';
export const useIsChain = (chainId: number) => chainId === 1;
export const useIsMainnet = () => true;
export const useIsTestnet = () => false;
export const useIsLocal = () => false;