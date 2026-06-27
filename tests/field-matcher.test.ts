import { describe, it, expect } from 'vitest'
import {
  normalize, tokenize, levenshtein, scoreField, suggestForHeader, suggestMappings,
} from '@/lib/field-matcher'
import { getObjectByKey, type MigrationObject } from '@/lib/migration-objects'

const gl = getObjectByKey('GL_ACCOUNT') as MigrationObject

describe('helpers', () => {
  it('normalize strips non-alphanumerics and lowercases', () => {
    expect(normalize('Company Code!')).toBe('companycode')
  })
  it('tokenize splits words and camelCase', () => {
    expect(tokenize('companyCode_name')).toEqual(['company', 'code', 'name'])
  })
  it('levenshtein computes edit distance', () => {
    expect(levenshtein('BUKRS', 'BUKRS')).toBe(0)
    expect(levenshtein('BUKR', 'BUKRS')).toBe(1)
    expect(levenshtein('abc', 'xyz')).toBe(3)
  })
})

describe('scoreField', () => {
  const bukrs = gl.fields.find((f) => f.name === 'BUKRS')!
  it('gives a perfect score for an exact technical-name match', () => {
    expect(scoreField('BUKRS', bukrs).score).toBe(1)
  })
  it('scores an exact label match very high', () => {
    expect(scoreField('Company Code', bukrs).score).toBeGreaterThanOrEqual(0.9)
  })
  it('uses synonyms (company → BUKRS)', () => {
    expect(scoreField('Company', bukrs).score).toBeGreaterThanOrEqual(0.8)
  })
  it('gives low scores to unrelated headers', () => {
    expect(scoreField('Favourite Colour', bukrs).score).toBeLessThan(0.4)
  })
})

describe('suggestForHeader', () => {
  it('ranks the correct SAP field first', () => {
    const s = suggestForHeader('Company Code', gl)
    expect(s[0].field).toBe('BUKRS')
  })
  it('respects the limit', () => {
    expect(suggestForHeader('Account', gl, 2).length).toBeLessThanOrEqual(2)
  })
  it('returns nothing for gibberish below threshold', () => {
    expect(suggestForHeader('zzzqqqxyz', gl)).toEqual([])
  })
})

describe('suggestMappings', () => {
  it('maps a list of source headers to SAP fields', () => {
    const result = suggestMappings(['Company Code', 'GL Account Number', '  '], gl)
    expect(result).toHaveLength(2) // blank header dropped
    const byHeader = Object.fromEntries(result.map((r) => [r.sourceHeader, r.suggestions[0]?.field]))
    expect(byHeader['Company Code']).toBe('BUKRS')
    expect(byHeader['GL Account Number']).toBe('SAKNR')
  })
  it('every suggestion carries a score and reason', () => {
    const [first] = suggestMappings(['Company Code'], gl)
    expect(first.suggestions[0].score).toBeGreaterThan(0)
    expect(first.suggestions[0].reason).toBeTruthy()
  })
})
