/**
 * @jest-environment node
 *
 * Regression test for the wallet-login authentication bypass reported by
 * OneDollarAgent (2026-09): the login handler used to verify the signature over
 * a client-supplied message, so any personal_sign signature the victim had ever
 * produced could be replayed as a login credential for their account.
 */
import { NextRequest } from 'next/server'
import { Wallet } from 'ethers'

// In-memory stand-in for the Redis layer used by the auth routes
const store = new Map<string, string>()
jest.mock('@/lib/redis', () => ({
  redis: {
    get: jest.fn(async (k: string) => store.get(k) ?? null),
    setex: jest.fn(async (k: string, _ttl: number, v: string) => { store.set(k, v); return 'OK' }),
    del: jest.fn(async (k: string) => (store.delete(k) ? 1 : 0)),
  },
}))

import { POST as nonceRoute } from '../nonce/route'
import { POST as loginRoute } from '../login/route'

process.env.NEXTAUTH_SECRET = 'test-secret'

const victim = Wallet.createRandom()
const attacker = Wallet.createRandom()

function post(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function requestNonce(address: string) {
  const res = await nonceRoute(post('/api/auth/nonce', { address }))
  const json = await res.json()
  expect(res.status).toBe(200)
  return json.data as { nonce: string; message: string }
}

beforeEach(() => store.clear())

describe('POST /api/auth/login', () => {
  it('accepts a signature over the server-issued challenge (legitimate flow)', async () => {
    const { nonce, message } = await requestNonce(victim.address)
    const signature = await victim.signMessage(message)

    const res = await loginRoute(post('/api/auth/login', { address: victim.address, nonce, message, signature }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.user.address).toBe(victim.address.toLowerCase())
    expect(typeof json.data.token).toBe('string')
  })

  it('rejects replay of a signature the victim produced on another site (reported attack)', async () => {
    // Signature the victim produced elsewhere, e.g. a "Welcome to X" SIWE-style
    // message on a different dapp, or a phishing page.
    const foreignMessage = 'Welcome to SomeOtherDapp!\n\nWallet address:\n' + victim.address + '\n\nNonce:\nabc123'
    const oldSignature = await victim.signMessage(foreignMessage)

    // Attacker fetches a fresh nonce for the victim's address (endpoint is unauthenticated)
    const { nonce } = await requestNonce(victim.address)

    const res = await loginRoute(post('/api/auth/login', {
      address: victim.address,
      nonce,
      message: foreignMessage,
      signature: oldSignature,
    }))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.data).toBeUndefined()
  })

  it('rejects a signature over the correct challenge made by a different key', async () => {
    const { nonce, message } = await requestNonce(victim.address)
    const signature = await attacker.signMessage(message)

    const res = await loginRoute(post('/api/auth/login', { address: victim.address, nonce, message, signature }))
    expect(res.status).toBe(401)
  })

  it('rejects a challenge issued to another address', async () => {
    const { nonce, message } = await requestNonce(attacker.address)
    const signature = await attacker.signMessage(message)

    // Attacker signs their own challenge but claims to be the victim
    const res = await loginRoute(post('/api/auth/login', { address: victim.address, nonce, message, signature }))
    expect(res.status).toBe(401)
  })

  it('consumes the nonce on first use, even when verification fails', async () => {
    const { nonce, message } = await requestNonce(victim.address)
    const bad = await attacker.signMessage(message)
    const good = await victim.signMessage(message)

    const first = await loginRoute(post('/api/auth/login', { address: victim.address, nonce, message, signature: bad }))
    expect(first.status).toBe(401)

    const second = await loginRoute(post('/api/auth/login', { address: victim.address, nonce, message, signature: good }))
    expect(second.status).toBe(401)
  })

  it('does not allow a second login with the same nonce', async () => {
    const { nonce, message } = await requestNonce(victim.address)
    const signature = await victim.signMessage(message)

    const first = await loginRoute(post('/api/auth/login', { address: victim.address, nonce, message, signature }))
    expect(first.status).toBe(200)

    const second = await loginRoute(post('/api/auth/login', { address: victim.address, nonce, message, signature }))
    expect(second.status).toBe(401)
  })

  it('treats the address case-insensitively when looking up the challenge', async () => {
    const { nonce, message } = await requestNonce(victim.address) // checksummed
    const signature = await victim.signMessage(message)

    const res = await loginRoute(post('/api/auth/login', {
      address: victim.address.toLowerCase(),
      nonce,
      message,
      signature,
    }))
    expect(res.status).toBe(200)
  })
})
