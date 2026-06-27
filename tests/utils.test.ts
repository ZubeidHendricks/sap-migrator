import { describe, it, expect } from 'vitest'
import { cn, slugify, formatDate, formatRelativeDate } from '@/lib/utils'

describe('cn (class merge)', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })
  it('dedupes conflicting tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
  it('handles conditional falsy values', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c')
  })
})

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Acme Corporation')).toBe('acme-corporation')
  })
  it('strips special characters', () => {
    expect(slugify('SAP S/4HANA 2023!')).toBe('sap-s-4hana-2023')
  })
  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Hello--  ')).toBe('hello')
  })
  it('collapses multiple separators', () => {
    expect(slugify('a___b   c')).toBe('a-b-c')
  })
})

describe('formatDate', () => {
  it('formats a date string as Mon D, YYYY', () => {
    expect(formatDate('2026-06-25T00:00:00Z')).toMatch(/Jun\s+2[45],\s+2026/)
  })
  it('accepts a Date object', () => {
    const d = new Date('2025-01-01T12:00:00Z')
    expect(formatDate(d)).toContain('2025')
  })
})

describe('formatRelativeDate', () => {
  it('returns Today for the current date', () => {
    expect(formatRelativeDate(new Date())).toBe('Today')
  })
  it('returns Yesterday for one day ago', () => {
    const d = new Date(Date.now() - 86400000)
    expect(formatRelativeDate(d)).toBe('Yesterday')
  })
  it('returns N days ago for the last week', () => {
    const d = new Date(Date.now() - 3 * 86400000)
    expect(formatRelativeDate(d)).toBe('3 days ago')
  })
  it('falls back to absolute date beyond a week', () => {
    const d = new Date(Date.now() - 30 * 86400000)
    expect(formatRelativeDate(d)).toMatch(/\d{4}/)
  })
})
