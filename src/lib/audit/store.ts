/**
 * Best-effort Redis persistence for audit trails.
 *
 * The off-chain coordinator maintains the verifiable chain; this module stores
 * and reloads it. Every operation is wrapped so that a missing or unreachable
 * Redis degrades gracefully (the demo still runs and returns the in-memory
 * trail) — matching the rest of the prototype's "degrade, never break" pattern.
 */

import redisClient from '@/lib/database/redis-client'
import { AuditTrail } from './audit-trail'
import type { AuditRecord } from './types'

const KEY_PREFIX = 'audit:chain:'
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 // 24 hours

export function auditKey(sessionId: string): string {
  return KEY_PREFIX + sessionId
}

/** Persist a trail's records. Returns false on any failure (never throws). */
export async function persistTrail(trail: AuditTrail, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<boolean> {
  try {
    await redisClient.set(auditKey(trail.sessionId), JSON.stringify(trail.getRecords()), ttlSeconds)
    return true
  } catch {
    return false
  }
}

/** Load a trail from Redis, or null if absent / unavailable / corrupt. */
export async function loadTrail(sessionId: string): Promise<AuditTrail | null> {
  try {
    const raw = await redisClient.get(auditKey(sessionId))
    if (!raw) return null
    const records = JSON.parse(raw) as AuditRecord[]
    return new AuditTrail(sessionId, records)
  } catch {
    return null
  }
}
