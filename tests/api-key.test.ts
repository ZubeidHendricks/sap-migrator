import { describe, it, expect } from 'vitest'
import { generateApiKey, hashApiKey, extractApiKey, looksLikeApiKey } from '@/lib/api-key'

describe('generateApiKey', () => {
  it('produces a prefixed key, a matching display prefix, and a hash', () => {
    const k = generateApiKey()
    expect(k.key.startsWith('smk_live_')).toBe(true)
    expect(k.prefix).toBe(k.key.slice(0, 16))
    expect(k.hash).toBe(hashApiKey(k.key))
    expect(k.hash).toHaveLength(64) // sha256 hex
  })
  it('produces unique keys', () => {
    expect(generateApiKey().key).not.toBe(generateApiKey().key)
  })
})

describe('hashApiKey', () => {
  it('is deterministic', () => {
    expect(hashApiKey('smk_live_abc')).toBe(hashApiKey('smk_live_abc'))
  })
  it('differs for different keys', () => {
    expect(hashApiKey('a')).not.toBe(hashApiKey('b'))
  })
})

describe('extractApiKey', () => {
  it('reads a Bearer token', () => {
    expect(extractApiKey('Bearer smk_live_xyz')).toBe('smk_live_xyz')
    expect(extractApiKey('bearer smk_live_xyz')).toBe('smk_live_xyz')
  })
  it('prefers x-api-key when present', () => {
    expect(extractApiKey('Bearer a', 'smk_live_b')).toBe('smk_live_b')
  })
  it('returns null when absent', () => {
    expect(extractApiKey(null)).toBeNull()
    expect(extractApiKey('Basic abc')).toBeNull()
  })
})

describe('looksLikeApiKey', () => {
  it('accepts well-formed keys', () => {
    expect(looksLikeApiKey(generateApiKey().key)).toBe(true)
  })
  it('rejects malformed keys', () => {
    expect(looksLikeApiKey('nope')).toBe(false)
    expect(looksLikeApiKey('smk_live_short')).toBe(false)
  })
})
