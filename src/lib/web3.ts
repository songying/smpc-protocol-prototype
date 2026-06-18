// Real Web3 utilities for MetaMask integration
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';

export interface MetaMaskProvider extends ethers.Eip1193Provider {
  isMetaMask: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
}

export class Web3Service {
  private provider: MetaMaskProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  async detectProvider(): Promise<boolean> {
    const detectedProvider = await detectEthereumProvider();
    
    if (detectedProvider && (detectedProvider as any).isMetaMask) {
      this.provider = detectedProvider as MetaMaskProvider;
      return true;
    }
    
    return false;
  }

  async connectWallet(): Promise<{ address: string; chainId: number }> {
    if (!this.provider) {
      const hasProvider = await this.detectProvider();
      if (!hasProvider) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }
    }

    try {
      // Request account access
      const accounts = await this.provider!.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please connect to MetaMask.');
      }

      // Get chain ID
      const chainId = await this.provider!.request({
        method: 'eth_chainId',
      });

      // Create ethers provider and signer
      const ethersProvider = new ethers.BrowserProvider(this.provider!);
      this.signer = await ethersProvider.getSigner();

      return {
        address: accounts[0],
        chainId: parseInt(chainId, 16),
      };
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('Please connect to MetaMask to continue.');
      }
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected. Please connect first.');
    }

    try {
      const signature = await this.signer.signMessage(message);
      return signature;
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('Message signing was rejected. Please sign to continue.');
      }
      throw new Error(`Failed to sign message: ${error.message}`);
    }
  }

  async switchChain(chainId: number): Promise<void> {
    if (!this.provider) {
      throw new Error('Wallet not connected.');
    }

    const chainIdHex = `0x${chainId.toString(16)}`;

    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (error: any) {
      // Chain not added to MetaMask
      if (error.code === 4902) {
        // Add Ethereum mainnet as default
        if (chainId === 1) {
          await this.provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIdHex,
                chainName: 'Ethereum Mainnet',
                nativeCurrency: {
                  name: 'Ether',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://mainnet.infura.io/v3/'],
                blockExplorerUrls: ['https://etherscan.io/'],
              },
            ],
          });
        } else {
          throw new Error('This chain is not supported. Please switch to Ethereum mainnet.');
        }
      } else {
        throw new Error(`Failed to switch chain: ${error.message}`);
      }
    }
  }

  async getCurrentAccount(): Promise<string | null> {
    if (!this.provider) {
      return null;
    }

    try {
      const accounts = await this.provider.request({
        method: 'eth_accounts',
      });
      return accounts && accounts.length > 0 ? accounts[0] : null;
    } catch {
      return null;
    }
  }

  async getCurrentChainId(): Promise<number | null> {
    if (!this.provider) {
      return null;
    }

    try {
      const chainId = await this.provider.request({
        method: 'eth_chainId',
      });
      return parseInt(chainId, 16);
    } catch {
      return null;
    }
  }

  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (this.provider) {
      this.provider.on('accountsChanged', callback);
    }
  }

  onChainChanged(callback: (chainId: string) => void): void {
    if (this.provider) {
      this.provider.on('chainChanged', callback);
    }
  }

  removeAllListeners(): void {
    if (this.provider) {
      this.provider.removeListener('accountsChanged', () => {});
      this.provider.removeListener('chainChanged', () => {});
    }
  }

  generateAuthMessage(address: string, nonce: string): string {
    return `Welcome to SMPC Protocol!

This request will not trigger a blockchain transaction or cost any gas fees.

Wallet address:
${address}

Nonce:
${nonce}`;
  }

  generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  verifySignature(message: string, signature: string, address: string): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch {
      return false;
    }
  }
}

// Chain configuration mapping
export const chainConfigs = {
  1: {
    id: 1,
    name: 'Ethereum Mainnet',
    network: 'mainnet',
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://eth-mainnet.g.alchemy.com/public',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  11155111: {
    id: 11155111,
    name: 'Sepolia Testnet',
    network: 'testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/public',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SEP',
      decimals: 18,
    },
  },
  1337: {
    id: 1337,
    name: 'Localhost',
    network: 'development',
    rpcUrl: 'http://localhost:8545',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
};

// Utility functions
export function getChainConfig(chainId: number) {
  return chainConfigs[chainId as keyof typeof chainConfigs] || null;
}

export function isChainSupported(chainId: number): boolean {
  return chainId in chainConfigs;
}

export function getChainName(chainId: number): string {
  const config = getChainConfig(chainId);
  return config?.name || `Unknown Chain (${chainId})`;
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatChainId(chainId: number): string {
  switch (chainId) {
    case 1:
      return 'Ethereum';
    case 11155111:
      return 'Sepolia';
    case 1337:
      return 'Localhost';
    default:
      return `Chain ${chainId}`;
  }
}

// Singleton instance
export const web3Service = new Web3Service();