import { describe, it, expect } from 'vitest'
import {
  parseXmlSpreadsheet,
  validateField,
  validateRows,
  validateSpreadsheet,
} from '@/lib/validation-rules'
import { generateXmlTemplate } from '@/lib/xml-generator'
import { getObjectByKey, type MigrationObject, type MigrationObjectField } from '@/lib/migration-objects'

const glAccount = getObjectByKey('GL_ACCOUNT') as MigrationObject

function field(partial: Partial<MigrationObjectField>): MigrationObjectField {
  return { name: 'F', label: 'F', required: false, type: 'string', ...partial }
}

describe('parseXmlSpreadsheet', () => {
  it('extracts technical names (row 2) and data rows (3+)', () => {
    const xml = `
      <Worksheet><Table>
        <Row><Cell><Data ss:Type="String">Company Code *</Data></Cell><Cell><Data ss:Type="String">Account *</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">BUKRS</Data></Cell><Cell><Data ss:Type="String">SAKNR</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">1000</Data></Cell><Cell><Data ss:Type="String">0001000000</Data></Cell></Row>
      </Table></Worksheet>`
    const parsed = parseXmlSpreadsheet(xml)
    expect(parsed.technicalNames).toEqual(['BUKRS', 'SAKNR'])
    expect(parsed.rows).toEqual([['1000', '0001000000']])
  })

  it('only parses the first worksheet (ignores the Field Guide sheet)', () => {
    const xml = generateXmlTemplate(glAccount, 2)
    const parsed = parseXmlSpreadsheet(xml)
    // technical names should be the GL account field names, not "Field Name" guide headers
    expect(parsed.technicalNames).toContain('SAKNR')
    expect(parsed.technicalNames).not.toContain('Technical Name')
  })

  it('unescapes XML entities in cells', () => {
    const xml = `<Worksheet><Table>
      <Row><Cell><Data ss:Type="String">L</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">NAME</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Tom &amp; Jerry</Data></Cell></Row>
    </Table></Worksheet>`
    expect(parseXmlSpreadsheet(xml).rows[0][0]).toBe('Tom & Jerry')
  })

  it('returns empty for malformed/short input', () => {
    expect(parseXmlSpreadsheet('<x/>')).toEqual({ technicalNames: [], rows: [] })
  })
})

describe('validateField', () => {
  it('flags missing required fields', () => {
    expect(validateField(field({ name: 'BUKRS', required: true }), '')?.severity).toBe('ERROR')
  })
  it('allows empty optional fields', () => {
    expect(validateField(field({ required: false }), '')).toBeNull()
  })
  it('enforces max length', () => {
    const i = validateField(field({ name: 'KUNNR', maxLength: 10 }), '12345678901')
    expect(i?.severity).toBe('ERROR')
    expect(i?.message).toMatch(/maximum length/)
  })
  it('accepts values at the max length boundary', () => {
    expect(validateField(field({ maxLength: 4 }), 'ABCD')).toBeNull()
  })
  it('rejects non-numeric values for number fields', () => {
    expect(validateField(field({ type: 'number' }), 'abc')?.severity).toBe('ERROR')
    expect(validateField(field({ type: 'number' }), '42')).toBeNull()
    expect(validateField(field({ type: 'number' }), '-3.14')).toBeNull()
  })
  it('accepts YYYY-MM-DD and YYYYMMDD dates, rejects others', () => {
    expect(validateField(field({ type: 'date' }), '2026-06-25')).toBeNull()
    expect(validateField(field({ type: 'date' }), '20260625')).toBeNull()
    expect(validateField(field({ type: 'date' }), '25/06/2026')?.severity).toBe('ERROR')
  })
  it('warns on non-X boolean values', () => {
    expect(validateField(field({ type: 'boolean' }), 'X')).toBeNull()
    expect(validateField(field({ type: 'boolean' }), 'yes')?.severity).toBe('WARNING')
  })
})

describe('validateRows / validateSpreadsheet', () => {
  const obj: MigrationObject = {
    key: 'T', name: 'T', category: 'Finance', description: '', approach: ['STAGING_TABLES'],
    fields: [
      field({ name: 'BUKRS', required: true, maxLength: 4 }),
      field({ name: 'AMOUNT', type: 'number' }),
    ],
  }

  it('counts valid / error rows and collects issues', () => {
    const parsed = {
      technicalNames: ['BUKRS', 'AMOUNT'],
      rows: [
        ['1000', '500'],     // valid
        ['', '500'],         // missing required BUKRS -> error
        ['1000', 'abc'],     // non-numeric AMOUNT -> error
        ['12345', '1'],      // BUKRS too long -> error
      ],
    }
    const s = validateRows(obj, parsed)
    expect(s.totalRows).toBe(4)
    expect(s.errorRows).toBe(3)
    expect(s.validRows).toBe(1)
    expect(s.issues.length).toBeGreaterThanOrEqual(3)
    expect(s.issues[0].row).toBe(2) // first issue is on data row 2
  })

  it('ignores fully-empty trailing rows', () => {
    const s = validateRows(obj, { technicalNames: ['BUKRS', 'AMOUNT'], rows: [['1000', '1'], ['', '']] })
    expect(s.totalRows).toBe(1)
    expect(s.errorRows).toBe(0)
  })

  it('a freshly generated template validates cleanly for required-but-filled examples', () => {
    // The generated template uses field examples; required fields have examples,
    // so there should be no ERROR-level issues from the sample rows.
    const summary = validateSpreadsheet(glAccount, generateXmlTemplate(glAccount, 3))
    expect(summary.errorRows).toBe(0)
  })
})
