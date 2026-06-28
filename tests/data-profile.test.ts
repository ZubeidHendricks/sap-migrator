import { describe, it, expect } from 'vitest'
import { profileRows } from '@/lib/data-profile'
import type { MigrationObject, MigrationObjectField } from '@/lib/migration-objects'
import type { ParsedSpreadsheet } from '@/lib/validation-rules'

const f = (p: Partial<MigrationObjectField>): MigrationObjectField => ({ name: 'F', label: 'F', required: false, type: 'string', ...p })
const obj: MigrationObject = {
  key: 'T', name: 'T', category: 'Finance', description: '', approach: ['STAGING_TABLES'],
  fields: [
    f({ name: 'BUKRS', label: 'Company Code', required: true }),
    f({ name: 'AMT', label: 'Amount', type: 'number' }),
  ],
}

const parsed: ParsedSpreadsheet = {
  technicalNames: ['BUKRS', 'AMT'],
  rows: [
    ['1000', '100'],
    ['1000', '200'],
    ['2000', ''],
    ['', '50'],
    ['', ''], // fully blank → ignored
  ],
}

describe('profileRows', () => {
  const p = profileRows(obj, parsed)

  it('counts only non-empty data rows', () => {
    expect(p.rowCount).toBe(4)
  })

  it('computes fill rate and blank count', () => {
    const bukrs = p.fields.find((x) => x.name === 'BUKRS')!
    expect(bukrs.fillRate).toBe(0.75) // 3 of 4 filled
    expect(bukrs.blankCount).toBe(1)
  })

  it('computes distinct counts and top values', () => {
    const bukrs = p.fields.find((x) => x.name === 'BUKRS')!
    expect(bukrs.distinctCount).toBe(2) // 1000, 2000
    expect(bukrs.topValues[0]).toEqual({ value: '1000', count: 2 })
  })

  it('computes numeric range for number fields', () => {
    const amt = p.fields.find((x) => x.name === 'AMT')!
    expect(amt.numeric).toEqual({ min: 50, max: 200, avg: expect.any(Number) })
    expect(amt.numeric!.avg).toBeCloseTo((100 + 200 + 50) / 3, 1)
  })

  it('records length range over non-empty values', () => {
    const bukrs = p.fields.find((x) => x.name === 'BUKRS')!
    expect(bukrs.minLength).toBe(4)
    expect(bukrs.maxLength).toBe(4)
  })

  it('handles an all-empty dataset gracefully', () => {
    const empty = profileRows(obj, { technicalNames: ['BUKRS', 'AMT'], rows: [['', '']] })
    expect(empty.rowCount).toBe(0)
    expect(empty.fields[0].fillRate).toBe(0)
    expect(empty.fields[0].numeric).toBeUndefined()
  })
})
