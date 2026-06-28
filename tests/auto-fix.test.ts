import { describe, it, expect } from 'vitest'
import { autoFix, autoFixBatch } from '@/lib/auto-fix'
import { buildFixPrompt, parseFixResponse, extractJson } from '@/lib/llm-auto-fix'
import { getObjectByKey, type MigrationObject, type MigrationObjectField } from '@/lib/migration-objects'

const gl = getObjectByKey('GL_ACCOUNT') as MigrationObject
const f = (p: Partial<MigrationObjectField>): MigrationObjectField => ({ name: 'F', label: 'F', required: false, type: 'string', ...p })

describe('autoFix (deterministic)', () => {
  it('truncates over-length values', () => {
    expect(autoFix(f({ maxLength: 4 }), 'TOOLONG')).toEqual({ suggested: 'TOOL', explanation: expect.stringContaining('Truncated') })
  })
  it('strips non-numerics for number fields', () => {
    expect(autoFix(f({ type: 'number' }), '$1,234.50')?.suggested).toBe('1234.50')
    expect(autoFix(f({ type: 'number' }), 'abc')).toBeNull()
  })
  it('reformats day-first dates to YYYY-MM-DD', () => {
    expect(autoFix(f({ type: 'date' }), '25/06/2026')?.suggested).toBe('2026-06-25')
    expect(autoFix(f({ type: 'date' }), '25.06.2026')?.suggested).toBe('2026-06-25')
  })
  it('swaps to handle US-style month-first dates', () => {
    expect(autoFix(f({ type: 'date' }), '06/25/2026')?.suggested).toBe('2026-06-25')
  })
  it('reformats YYYY/MM/DD', () => {
    expect(autoFix(f({ type: 'date' }), '2026/6/5')?.suggested).toBe('2026-06-05')
  })
  it('normalizes booleans', () => {
    expect(autoFix(f({ type: 'boolean' }), 'yes')?.suggested).toBe('X')
    expect(autoFix(f({ type: 'boolean' }), 'false')?.suggested).toBe('')
  })
  it('returns null for missing required data', () => {
    expect(autoFix(f({ required: true }), '')).toBeNull()
  })
})

describe('autoFixBatch', () => {
  it('fixes what it can and skips the rest', () => {
    const fields = { KUNNR: f({ name: 'KUNNR', maxLength: 10 }), AMT: f({ name: 'AMT', type: 'number' }) }
    const out = autoFixBatch(fields, [
      { row: 1, field: 'KUNNR', value: '123456789012' }, // too long → truncated
      { row: 2, field: 'AMT', value: 'not a number' },   // unfixable → skipped
      { row: 3, field: 'UNKNOWN', value: 'x' },          // unknown field → skipped
    ])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ row: 1, field: 'KUNNR', suggested: '1234567890' })
  })
})

describe('llm-auto-fix helpers', () => {
  const fields = { BUKRS: gl.fields.find((x) => x.name === 'BUKRS')!, SAKNR: gl.fields.find((x) => x.name === 'SAKNR')! }

  it('buildFixPrompt lists fields, failed cells, and requests JSON', () => {
    const p = buildFixPrompt(gl, Object.values(fields), [{ row: 2, field: 'SAKNR', value: '00010000000000', message: 'too long' }])
    expect(p).toContain('SAKNR')
    expect(p).toContain('row 2')
    expect(p).toMatch(/JSON object/i)
  })

  it('extractJson handles fences/prose', () => {
    expect(extractJson('text {"fixes":[]} more')).toEqual({ fixes: [] })
  })

  it('parseFixResponse validates, clamps maxLength, and back-fills original value', () => {
    const inputs = [{ row: 2, field: 'SAKNR', value: '00010000000000' }]
    const raw = JSON.stringify({ fixes: [
      { row: 2, field: 'SAKNR', suggested: '0001000000', explanation: 'trim to 10' },
      { row: 3, field: 'NOPE', suggested: 'x' }, // unknown field dropped
      { field: 'SAKNR', suggested: 'y' },        // missing row dropped
    ] })
    const out = parseFixResponse(raw, fields, inputs)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ row: 2, field: 'SAKNR', value: '00010000000000', suggested: '0001000000' })
  })

  it('parseFixResponse throws on non-JSON', () => {
    expect(() => parseFixResponse('nope', fields, [])).toThrow()
  })
})
