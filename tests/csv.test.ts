import { describe, it, expect } from 'vitest'
import { parseCSV, csvCell, toCSV, parseMappingsCSV } from '@/lib/csv'

describe('parseCSV', () => {
  it('parses a simple grid', () => {
    expect(parseCSV('a,b,c\n1,2,3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']])
  })
  it('handles quoted fields containing commas', () => {
    expect(parseCSV('"Smith, John",42')).toEqual([['Smith, John', '42']])
  })
  it('handles escaped quotes', () => {
    expect(parseCSV('"She said ""hi""",x')).toEqual([['She said "hi"', 'x']])
  })
  it('skips blank lines', () => {
    expect(parseCSV('a\n\n\nb')).toEqual([['a'], ['b']])
  })
  it('handles CRLF line endings', () => {
    expect(parseCSV('a,b\r\nc,d')).toEqual([['a', 'b'], ['c', 'd']])
  })
})

describe('csvCell / toCSV', () => {
  it('wraps values in quotes', () => {
    expect(csvCell('hello')).toBe('"hello"')
  })
  it('escapes embedded quotes', () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
  })
  it('renders null/undefined as empty string', () => {
    expect(csvCell(null)).toBe('""')
    expect(csvCell(undefined)).toBe('""')
  })
  it('serializes a grid round-trip safely', () => {
    const rows = [['Object Key', 'Field Name'], ['GL_ACCOUNT', 'BUKRS']]
    const csv = toCSV(rows)
    // strip the surrounding quotes the parser preserves the data
    expect(parseCSV(csv)).toEqual(rows)
  })
})

describe('parseMappingsCSV', () => {
  const header = 'Object Key,Field Name,Field Label,Source Value,Target Value'

  it('parses valid rows', () => {
    const { rows, error } = parseMappingsCSV(`${header}\nGL_ACCOUNT,BUKRS,Company Code,1000,0001`)
    expect(error).toBeUndefined()
    expect(rows).toEqual([
      { objectKey: 'GL_ACCOUNT', fieldName: 'BUKRS', fieldLabel: 'Company Code', sourceValue: '1000', targetValue: '0001' },
    ])
  })

  it('rejects a CSV missing required columns', () => {
    const { error } = parseMappingsCSV('Object Key,Field Name\nGL_ACCOUNT,BUKRS')
    expect(error).toMatch(/must have columns/i)
  })

  it('rejects a CSV with only a header', () => {
    const { error } = parseMappingsCSV(header)
    expect(error).toMatch(/at least one data row/i)
  })

  it('skips rows with missing required values', () => {
    const { rows } = parseMappingsCSV(`${header}\nGL_ACCOUNT,BUKRS,,1000,0001\nGL_ACCOUNT,,,, `)
    expect(rows).toHaveLength(1)
  })

  it('treats Field Label as optional', () => {
    const { rows } = parseMappingsCSV('Object Key,Field Name,Source Value,Target Value\nGL_ACCOUNT,BUKRS,1000,0001')
    expect(rows[0].fieldLabel).toBeUndefined()
    expect(rows[0].targetValue).toBe('0001')
  })

  it('is tolerant of column ordering and casing in the header', () => {
    const { rows, error } = parseMappingsCSV('TARGET VALUE,source value,Field Name,object key\n0001,1000,BUKRS,GL_ACCOUNT')
    expect(error).toBeUndefined()
    expect(rows[0]).toMatchObject({ objectKey: 'GL_ACCOUNT', fieldName: 'BUKRS', sourceValue: '1000', targetValue: '0001' })
  })
})
