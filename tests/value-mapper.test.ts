import { describe, it, expect } from 'vitest'
import { suggestValue, suggestValues } from '@/lib/value-mapper'
import { buildValuePrompt, parseValueResponse, extractJson } from '@/lib/llm-value-mapper'
import { getObjectByKey, type MigrationObject, type MigrationObjectField } from '@/lib/migration-objects'

const gl = getObjectByKey('GL_ACCOUNT') as MigrationObject
const f = (p: Partial<MigrationObjectField>): MigrationObjectField => ({ name: 'F', label: 'F', required: false, type: 'string', ...p })

describe('suggestValue (deterministic)', () => {
  const currency = f({ name: 'WAERS', label: 'Account Currency', type: 'string', maxLength: 5 })
  const country = f({ name: 'LAND1', label: 'Country', type: 'string', maxLength: 3 })
  const bool = f({ name: 'XBILK', label: 'Balance Sheet Account', type: 'boolean' })

  it('maps currency names to ISO codes', () => {
    expect(suggestValue(currency, 'US Dollar')?.targetValue).toBe('USD')
    expect(suggestValue(currency, 'euro')?.targetValue).toBe('EUR')
    expect(suggestValue(currency, 'Rand')?.targetValue).toBe('ZAR')
  })
  it('maps country names to ISO codes', () => {
    expect(suggestValue(country, 'United States')?.targetValue).toBe('US')
    expect(suggestValue(country, 'Germany')?.targetValue).toBe('DE')
  })
  it('maps boolean-ish values to X / empty', () => {
    expect(suggestValue(bool, 'Yes')?.targetValue).toBe('X')
    expect(suggestValue(bool, 'no')?.targetValue).toBe('')
    expect(suggestValue(bool, '1')?.targetValue).toBe('X')
  })
  it('passes through values that already look like codes', () => {
    const s = suggestValue(f({ maxLength: 4 }), 'GRAL')
    expect(s?.targetValue).toBe('GRAL')
    expect(s?.confidence).toBeLessThan(0.6)
  })
  it('returns null for unmappable free text', () => {
    expect(suggestValue(f({ name: 'TXT50', label: 'Short Text' }), 'Some long description here')).toBeNull()
  })
  it('returns null for empty values', () => {
    expect(suggestValue(f({}), '   ')).toBeNull()
  })
})

describe('suggestValues', () => {
  it('dedupes and skips blanks', () => {
    const cur = f({ name: 'WAERS', label: 'Currency', type: 'string' })
    const out = suggestValues(cur, ['USD', 'USD', '', 'Euro'])
    const targets = out.map((s) => s.targetValue)
    expect(targets).toContain('USD')
    expect(targets).toContain('EUR')
    expect(out.filter((s) => s.targetValue === 'USD')).toHaveLength(1)
  })
})

describe('llm-value-mapper helpers', () => {
  const cur = f({ name: 'WAERS', label: 'Account Currency', type: 'string', maxLength: 5 })

  it('buildValuePrompt includes object, field and values + asks for JSON', () => {
    const p = buildValuePrompt(gl, cur, ['US Dollar', 'Euro'])
    expect(p).toContain('WAERS')
    expect(p).toContain('US Dollar')
    expect(p).toMatch(/JSON object/i)
  })

  it('extractJson tolerates prose and fences', () => {
    expect(extractJson('```json\n{"suggestions":[]}\n```')).toEqual({ suggestions: [] })
  })

  it('parseValueResponse validates and clamps to maxLength', () => {
    const raw = JSON.stringify({ suggestions: [
      { sourceValue: 'US Dollar', targetValue: 'USD', confidence: 0.99, reason: 'iso' },
      { sourceValue: 'Long', targetValue: 'TOOLONGVALUE', confidence: 5 },
      { targetValue: 'X' }, // missing sourceValue → dropped
    ] })
    const out = parseValueResponse(raw, cur)
    expect(out).toHaveLength(2)
    expect(out[0].targetValue).toBe('USD')
    expect(out[1].targetValue.length).toBeLessThanOrEqual(5) // clamped
    expect(out[1].confidence).toBe(1) // clamped
  })

  it('parseValueResponse throws on non-JSON (caller falls back)', () => {
    expect(() => parseValueResponse('nope', cur)).toThrow()
  })
})
