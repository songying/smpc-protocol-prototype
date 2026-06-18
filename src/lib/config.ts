/**
 * Central runtime configuration for the SMPC platform.
 *
 * The prototype is a "convincing vertical slice": one path is genuinely live
 * (contracts deployed & called on-chain, real Shamir 3-node aggregation,
 * fee split enforced on-chain). Everything degrades gracefully to the prior
 * mock behaviour when the relevant feature flag is off, so `npm run dev`
 * keeps working without a chain or the coordinator running.
 *
 * Server-only secrets (SERVER_PRIVATE_KEY) must never be exposed to the client;
 * only NEXT_PUBLIC_* values are safe in the browser.
 */

export const config = {
  /** Contract deployment network name; matches deployments/<network>-*.json */
  network: process.env.CONTRACT_NETWORK || 'localhost',

  chain: {
    rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545',
    chainId: parseInt(process.env.CHAIN_ID || '1337', 10),
    /** Funded relayer key (deployer) the backend uses to submit transactions. */
    serverPrivateKey: process.env.SERVER_PRIVATE_KEY || '',
  },

  /** Off-chain SMPC coordinator that fans shares out to the compute nodes. */
  coordinatorUrl: process.env.COORDINATOR_URL || 'http://localhost:8080',

  features: {
    /** When true, API routes mirror state onto the smart contracts. */
    onchain: process.env.ENABLE_ONCHAIN === 'true',
    /** When true, execution runs the real Shamir 3-node aggregation. */
    realSmpc: process.env.ENABLE_REAL_SMPC === 'true',
  },
} as const

/**
 * Client-safe flags + cosmetic config. Drives the "Simulated" badges so the
 * demo is honest about which layers are live vs illustrative (matches the
 * thesis non-claims for ZK/FHE).
 */
export const publicConfig = {
  realSmpc: process.env.NEXT_PUBLIC_ENABLE_REAL_SMPC === 'true',
  onchain: process.env.NEXT_PUBLIC_ENABLE_ONCHAIN === 'true',
  /** Base URL for tx-hash links; empty => render as a non-clickable hash chip. */
  explorerBase: process.env.NEXT_PUBLIC_EXPLORER_BASE || '',
  chainName: process.env.NEXT_PUBLIC_CHAIN_NAME || 'SMPC Local Chain',
} as const

export type AppConfig = typeof config
