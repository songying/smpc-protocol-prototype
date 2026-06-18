/**
 * Per-party signing for audit attestations.
 *
 * In the production design each party — the data provider, each compute node,
 * the consumer, and the validator — holds its own key and signs only the stage
 * it is responsible for. In the relayer-based prototype the backend holds the
 * keys, so a distinct, deterministic keypair is DERIVED per (base, party,
 * actorId). This preserves genuine signature attribution (every record recovers
 * to a stable per-party address) while remaining runnable without provisioning
 * external wallets.
 *
 * The verifier never trusts a key registry: it recovers the signer directly
 * from the signature and checks it equals the address recorded in `actor`.
 * Boundary (QE2.2): the chain proves integrity and attribution of the recorded
 * events, not the truthfulness of the underlying data — and in the relayer
 * model a fully-compromised coordinator that holds every key could re-sign a
 * forged chain. Production custody (per-party keys / HSM) is future work.
 */

import { ethers } from 'ethers'

/** Derive a deterministic demo keypair for a party. NOT production key custody. */
export function derivePartyWallet(base: string, party: string, actorId: string): ethers.Wallet {
  const seed = ethers.keccak256(ethers.toUtf8Bytes(`smpc:audit:${base}:${party}:${actorId}`))
  return new ethers.Wallet(seed)
}

/** Sign a record hash using the EIP-191 personal-message scheme. */
export async function signHash(privateKey: string, hash: string): Promise<string> {
  const wallet = new ethers.Wallet(privateKey)
  return wallet.signMessage(ethers.getBytes(hash))
}

/** Recover the signer address from a record hash and its signature. */
export function recoverSigner(hash: string, signature: string): string {
  return ethers.verifyMessage(ethers.getBytes(hash), signature)
}

/** Address that corresponds to a private key (so callers can set `actor`). */
export function addressForKey(privateKey: string): string {
  return new ethers.Wallet(privateKey).address
}
