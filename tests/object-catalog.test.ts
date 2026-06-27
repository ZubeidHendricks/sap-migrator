import { describe, it, expect } from 'vitest'
import { validateCustomObject, normalizeCustomObject, customToMigrationObject } from '@/lib/object-catalog'

const valid = {
  key: 'Z_PRICE_LIST',
  name: 'Price List',
  category: 'Logistics',
  approach: ['STAGING_TABLES'],
  fields: [
    { name: 'KSCHL', label: 'Condition Type', type: 'string', required: true, maxLength: 4 },
    { name: 'KBETR', label: 'Rate', type: 'number', required: false },
  ],
}

describe('validateCustomObject', () => {
  it('accepts a valid definition', () => {
    expect(validateCustomObject(valid)).toBeNull()
  })
  it('requires a key', () => {
    expect(validateCustomObject({ ...valid, key: '' })).toMatch(/key is required/i)
  })
  it('enforces key format', () => {
    expect(validateCustomObject({ ...valid, key: 'lower_case' })).toMatch(/UPPERCASE/)
    expect(validateCustomObject({ ...valid, key: '1ABC' })).toMatch(/UPPERCASE/)
  })
  it('rejects reserved built-in keys', () => {
    expect(validateCustomObject({ ...valid, key: 'GL_ACCOUNT' })).toMatch(/reserved/i)
  })
  it('requires a name and category', () => {
    expect(validateCustomObject({ ...valid, name: '' })).toMatch(/name is required/i)
    expect(validateCustomObject({ ...valid, category: '' })).toMatch(/category/i)
  })
  it('requires at least one valid approach', () => {
    expect(validateCustomObject({ ...valid, approach: [] })).toMatch(/approach/i)
    expect(validateCustomObject({ ...valid, approach: ['NOPE'] })).toMatch(/Invalid approach/)
  })
  it('requires at least one field', () => {
    expect(validateCustomObject({ ...valid, fields: [] })).toMatch(/at least one field/i)
  })
  it('validates field names, types and dupes', () => {
    expect(validateCustomObject({ ...valid, fields: [{ name: '', label: 'x', type: 'string' }] })).toMatch(/technical name/i)
    expect(validateCustomObject({ ...valid, fields: [{ name: 'A', label: 'x', type: 'banana' }] })).toMatch(/invalid type/i)
    expect(validateCustomObject({ ...valid, fields: [
      { name: 'DUP', label: 'a', type: 'string' },
      { name: 'dup', label: 'b', type: 'string' },
    ] })).toMatch(/Duplicate/i)
  })
  it('rejects invalid maxLength', () => {
    expect(validateCustomObject({ ...valid, fields: [{ name: 'A', label: 'x', type: 'string', maxLength: -1 }] })).toMatch(/max length/i)
  })
})

describe('normalizeCustomObject', () => {
  it('trims and shapes the stored record', () => {
    const n = normalizeCustomObject({ ...valid, key: ' z_price_list ' as unknown as string, description: '  ', sapTable: ' A004 ' })
    expect(n.key).toBe('z_price_list') // trimmed (caller uppercases before validation)
    expect(n.description).toBeNull() // blank → null
    expect(n.sapTable).toBe('A004')
    expect(n.fields[0]).toMatchObject({ name: 'KSCHL', label: 'Condition Type', type: 'string', required: true, maxLength: 4 })
    expect(n.fields[1].maxLength).toBeUndefined()
  })
})

describe('customToMigrationObject', () => {
  it('adapts a DB record into a MigrationObject with custom flag', () => {
    const obj = customToMigrationObject({
      key: 'Z_X', name: 'X', category: 'Finance', description: null, sapTable: null,
      approach: ['DIRECT_TRANSFER'], fields: [{ name: 'F', label: 'F', type: 'string', required: false }],
    })
    expect(obj.key).toBe('Z_X')
    expect(obj.custom).toBe(true)
    expect(obj.approach).toEqual(['DIRECT_TRANSFER'])
    expect(obj.fields).toHaveLength(1)
    expect(obj.description).toBe('') // null → ''
  })
  it('tolerates non-array approach/fields', () => {
    const obj = customToMigrationObject({ key: 'Z', name: 'Z', category: 'Basis', description: 'd', sapTable: 'T', approach: null, fields: null })
    expect(obj.approach).toEqual([])
    expect(obj.fields).toEqual([])
  })
})
