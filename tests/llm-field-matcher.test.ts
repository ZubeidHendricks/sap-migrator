import { describe, it, expect } from 'vitest'
import { buildPrompt, extractJson, parseLlmMappingResponse, isLlmEnabled } from '@/lib/llm-field-matcher'
import { getObjectByKey, type MigrationObject } from '@/lib/migration-objects'

const gl = getObjectByKey('GL_ACCOUNT') as MigrationObject

describe('isLlmEnabled', () => {
  it('reflects presence of ANTHROPIC_API_KEY', () => {
    const had = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    expect(isLlmEnabled()).toBe(false)
    process.env.ANTHROPIC_API_KEY = 'test-key'
    expect(isLlmEnabled()).toBe(true)
    if (had === undefined) delete process.env.ANTHROPIC_API_KEY
    else process.env.ANTHROPIC_API_KEY = had
  })
})

describe('buildPrompt', () => {
  const prompt = buildPrompt(['Company Code', 'GL Account'], gl)
  it('includes the object name, its fields, and the headers', () => {
    expect(prompt).toContain('General Ledger Account')
    expect(prompt).toContain('BUKRS')
    expect(prompt).toContain('Company Code')
    expect(prompt).toContain('GL Account')
  })
  it('asks for strict JSON output', () => {
    expect(prompt).toMatch(/JSON object/i)
    expect(prompt).toContain('sourceHeader')
  })
})

describe('extractJson', () => {
  it('parses a bare JSON object', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 })
  })
  it('parses JSON inside a markdown fence', () => {
    expect(extractJson('```json\n{"a":2}\n```')).toEqual({ a: 2 })
  })
  it('parses JSON surrounded by prose', () => {
    expect(extractJson('Here you go: {"a":3} hope that helps')).toEqual({ a: 3 })
  })
  it('throws when there is no JSON', () => {
    expect(() => extractJson('no json here')).toThrow()
  })
})

describe('parseLlmMappingResponse', () => {
  it('parses valid suggestions and keeps only real SAP fields', () => {
    const raw = JSON.stringify({
      suggestions: [
        { sourceHeader: 'Company Code', suggestions: [{ field: 'BUKRS', score: 0.98, reason: 'maps to company code' }] },
        { sourceHeader: 'Junk', suggestions: [{ field: 'NOT_A_FIELD', score: 0.9, reason: 'x' }] },
      ],
    })
    const out = parseLlmMappingResponse(raw, gl)
    expect(out).toHaveLength(2)
    expect(out[0].suggestions[0].field).toBe('BUKRS')
    expect(out[0].suggestions[0].label).toBe('Company Code') // enriched from catalog
    // hallucinated field dropped
    expect(out[1].suggestions).toHaveLength(0)
  })

  it('clamps out-of-range scores and defaults a missing reason', () => {
    const raw = JSON.stringify({
      suggestions: [{ sourceHeader: 'X', suggestions: [{ field: 'BUKRS', score: 5 }] }],
    })
    const out = parseLlmMappingResponse(raw, gl)
    expect(out[0].suggestions[0].score).toBe(1)
    expect(out[0].suggestions[0].reason).toBeTruthy()
  })

  it('sorts suggestions best-first and caps at 3', () => {
    const raw = JSON.stringify({
      suggestions: [{ sourceHeader: 'X', suggestions: [
        { field: 'BUKRS', score: 0.5, reason: 'a' },
        { field: 'SAKNR', score: 0.9, reason: 'b' },
        { field: 'KTOKS', score: 0.7, reason: 'c' },
        { field: 'TXT50', score: 0.6, reason: 'd' },
      ] }],
    })
    const out = parseLlmMappingResponse(raw, gl)
    expect(out[0].suggestions).toHaveLength(3)
    expect(out[0].suggestions[0].field).toBe('SAKNR')
  })

  it('throws on non-JSON (caller treats as failure → falls back)', () => {
    expect(() => parseLlmMappingResponse('the model refused', gl)).toThrow()
  })
})
