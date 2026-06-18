import { createConfig, http } from 'wagmi'
import { localhost, hardhat } from 'wagmi/chains'
import { metaMask, injected } from 'wagmi/connectors'

// Define our local chain configuration
export const localChain = {
  id: 1337,
  name: 'Local Ganache',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  blockExplorers: {
    default: { name: 'Local Explorer', url: 'http://127.0.0.1:8545' },
  },
  testnet: true,
} as const

// Create wagmi configuration
export const wagmiConfig = createConfig({
  chains: [localChain, localhost, hardhat],
  connectors: [
    metaMask(),
    injected(),
  ],
  transports: {
    [localChain.id]: http('http://127.0.0.1:8545'),
    [localhost.id]: http('http://127.0.0.1:8545'),
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
})

// Contract addresses from deployment
export const CONTRACT_ADDRESSES = {
  DataRegistry: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  FeeManagement: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  ApprovalManager: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  PrivacyCompliance: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  ComputingRequest: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
} as const

// Helper type for contract names
export type ContractName = keyof typeof CONTRACT_ADDRESSES