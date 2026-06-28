import { describe, it, expect } from 'vitest'
import { sanitizeIdentifier, pgColumnType, buildCreateTable, buildInsert } from '@/lib/connectors/sql'
import { generateSampleRows } from '@/lib/connectors/sample-source'
import { buildExtractCsv } from '@/lib/connectors/csv-target'
import { parseCSV } from '@/lib/csv'
import { getObjectByKey, type MigrationObject, type MigrationObjectField } from '@/lib/migration-objects'

const gl = getObjectByKey('GL_ACCOUNT') as MigrationObject
const f = (p: Partial<MigrationObjectField>): MigrationObjectField => ({ name: 'F', label: 'F', required: false, type: 'string', ...p })

describe('sanitizeIdentifier', () => {
  it('lowercases and snake-cases', () => {
    expect(sanitizeIdentifier('GL Account!')).toBe('gl_account')
  })
  it('prefixes leading digits', () => {
    expect(sanitizeIdentifier('1tbl')).toBe('c_1tbl')
  })
  it('never returns empty', () => {
    expect(sanitizeIdentifier('!!!')).toBe('col')
  })
  it('caps at 63 chars', () => {
    expect(sanitizeIdentifier('a'.repeat(100)).length).toBe(63)
  })
})

describe('pgColumnType', () => {
  it('maps number to NUMERIC', () => { expect(pgColumnType(f({ type: 'number' }))).toBe('NUMERIC') })
  it('maps sized string to VARCHAR(n)', () => { expect(pgColumnType(f({ type: 'string', maxLength: 4 }))).toBe('VARCHAR(4)') })
  it('falls back to TEXT for date/boolean/unsized', () => {
    expect(pgColumnType(f({ type: 'date' }))).toBe('TEXT')
    expect(pgColumnType(f({ type: 'boolean' }))).toBe('TEXT')
    expect(pgColumnType(f({ type: 'string' }))).toBe('TEXT')
  })
})

describe('buildCreateTable', () => {
  it('builds a safe CREATE TABLE IF NOT EXISTS', () => {
    const ddl = buildCreateTable('sap_GL_ACCOUNT', [f({ name: 'BUKRS', type: 'string', maxLength: 4 }), f({ name: 'AMT', type: 'number' })])
    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS "sap_gl_account"')
    expect(ddl).toContain('"bukrs" VARCHAR(4)')
    expect(ddl).toContain('"amt" NUMERIC')
  })
})

describe('buildInsert', () => {
  it('produces parameterized SQL and a flat value array', () => {
    const fields = [f({ name: 'A' }), f({ name: 'B' })]
    const { text, values } = buildInsert('t', fields, [{ A: '1', B: '2' }, { A: '3', B: '' }])
    expect(text).toContain('INSERT INTO "t" ("a", "b") VALUES ($1, $2), ($3, $4);')
    expect(values).toEqual(['1', '2', '3', null]) // empty string → null
  })
})

describe('generateSampleRows', () => {
  it('produces the requested number of rows with all fields', () => {
    const { rows } = generateSampleRows(gl, 5)
    expect(rows).toHaveLength(5)
    for (const r of rows) for (const fld of gl.fields) expect(r[fld.name]).toBeDefined()
  })
  it('is deterministic for the same object', () => {
    expect(generateSampleRows(gl, 3)).toEqual(generateSampleRows(gl, 3))
  })
  it('respects maxLength on string fields', () => {
    const obj: MigrationObject = { ...gl, fields: [f({ name: 'X', type: 'string', maxLength: 3 })] }
    for (const r of generateSampleRows(obj, 10).rows) expect(r.X.length).toBeLessThanOrEqual(3)
  })
})

describe('buildExtractCsv', () => {
  it('emits a parseable CSV with a header block per object', () => {
    const { rows } = generateSampleRows(gl, 2)
    const csv = buildExtractCsv([{ objectKey: gl.key, objectName: gl.name, fields: gl.fields, rows }])
    const parsed = parseCSV(csv)
    expect(parsed[0][0]).toContain(gl.key)              // object header comment
    expect(parsed[1]).toEqual(gl.fields.map((x) => x.name)) // column names row
    expect(parsed.length).toBe(2 + 2)                    // header + names + 2 data rows
  })
})
