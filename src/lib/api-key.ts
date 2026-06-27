// API key generation, hashing, and request authentication helpers.
// Keys are high-entropy random strings; we store only a SHA-256 hash (fast,
// deterministic lookup) plus a visible prefix for display. The full key is
// shown to the user exactly once at creation.

import crypto from 'crypto'
import { prisma } from './prisma'

const KEY_PREFIX = 'smk_live_'

export interface GeneratedKey {
  key: string // full secret — shown once
  prefix: string // stored + displayed
  hash: string // stored
}

/** Generate a new API key: full secret, display prefix, and storage hash. */
export function generateApiKey(): GeneratedKey {
  const random = crypto.randomBytes(24).toString('hex') // 48 hex chars
  const key = `${KEY_PREFIX}${random}`
  return { key, prefix: key.slice(0, 16), hash: hashApiKey(key) }
}

/** Deterministic SHA-256 hash used for storage and lookup. */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/** Extract the API key from an Authorization: Bearer / x-api-key header value. */
export function extractApiKey(authHeader: string | null, xApiKey?: string | null): string | null {
  if (xApiKey && xApiKey.trim()) return xApiKey.trim()
  if (!authHeader) return null
  const m = authHeader.match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : null
}

export function looksLikeApiKey(key: string): boolean {
  return key.startsWith(KEY_PREFIX) && key.length >= KEY_PREFIX.length + 32
}

export interface ApiKeyAuthResult {
  organizationId: string
  keyId: string
}

/** Authenticate a request by API key. Returns the org context or null.
 *  Updates lastUsedAt on success (best-effort). */
export async function authenticateApiKey(req: Request): Promise<ApiKeyAuthResult | null> {
  const raw = extractApiKey(req.headers.get('authorization'), req.headers.get('x-api-key'))
  if (!raw || !looksLikeApiKey(raw)) return null

  const record = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(raw) } })
  if (!record || record.revokedAt) return null

  prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => {})
  return { organizationId: record.organizationId, keyId: record.id }
}
