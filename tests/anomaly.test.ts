import { describe, it, expect } from 'vitest'
import { analyzeQuality, patternSignature } from '@/lib/anomaly'
import type { MigrationObject, MigrationObjectField } from '@/lib/migration-objects'
import type { ParsedSpreadsheet } from '@/lib/validation-rules'

const f = (p: Partial<MigrationObjectField>): MigrationObjectField => ({ name: 'F', label: 'F', required: false, type: 'string', ...p })

describe('patternSignature', () => {
  it('collapses character-class runs', () => {
    expect(patternSignature('0001000000')).toBe('9')
    expect(patternSignature('GRAL')).toBe('A')
    expect(patternSignature('GR12')).toBe('A9')
    expect(patternSignature('AB-12')).toBe('A.9')
  })
})

describe('analyzeQuality — duplicates', () => {
  const obj: MigrationObject = {
    key: 'T', name: 'T', category: 'Finance', description: '', approach: ['STAGING_TABLES'],
    fields: [f({ name: 'KEYF', label: 'Key' }), f({ name: 'OTHER' })],
  }
  it('flags duplicate key values with their rows', () => {
    const parsed: ParsedSpreadsheet = { technicalNames: ['KEYF', 'OTHER'], rows: [
      ['A', '1'], ['B', '2'], ['A', '3'], ['A', '4'], ['B', '5'],
    ] }
    const q = analyzeQuality(obj, parsed)
    expect(q.keyField).toBe('KEYF')
    const a = q.duplicates.find((d) => d.value === 'A')!
    expect(a.count).toBe(3)
    expect(a.rows).toEqual([1, 3, 4])
    expect(q.duplicateRowCount).toBe(5) // 3 (A) + 2 (B)
  })
  it('reports no duplicates when keys are unique', () => {
    const parsed: ParsedSpreadsheet = { technicalNames: ['KEYF', 'OTHER'], rows: [['A', '1'], ['B', '2']] }
    expect(analyzeQuality(obj, parsed).duplicates).toEqual([])
  })
})

describe('analyzeQuality — anomalies', () => {
  it('flags numeric outliers by z-score', () => {
    const obj: MigrationObject = {
      key: 'T', name: 'T', category: 'Finance', description: '', approach: ['STAGING_TABLES'],
      fields: [f({ name: 'ID' }), f({ name: 'AMT', type: 'number' })],
    }
    // 9 normal values around 100, one extreme outlier
    const amts = ['100', '101', '99', '100', '102', '98', '101', '99', '100', '99999']
    const rows = amts.map((a, i) => [`ID${i}`, a])
    const q = analyzeQuality(obj, { technicalNames: ['ID', 'AMT'], rows })
    const out = q.anomalies.filter((a) => a.kind === 'numeric_outlier')
    expect(out.length).toBe(1)
    expect(out[0].value).toBe('99999')
  })

  it('flags format outliers against a dominant pattern', () => {
    const obj: MigrationObject = {
      key: 'T', name: 'T', category: 'Finance', description: '', approach: ['STAGING_TABLES'],
      fields: [f({ name: 'CODE' })],
    }
    // 9 all-digit codes + 1 with letters
    const codes = ['1000','1001','1002','1003','1004','1005','1006','1007','1008','ABCD']
    const q = analyzeQuality(obj, { technicalNames: ['CODE'], rows: codes.map((c) => [c]) })
    const fmt = q.anomalies.filter((a) => a.kind === 'format_outlier')
    expect(fmt.some((a) => a.value === 'ABCD')).toBe(true)
  })

  it('skips anomaly detection for small samples (<8)', () => {
    const obj: MigrationObject = {
      key: 'T', name: 'T', category: 'Finance', description: '', approach: ['STAGING_TABLES'],
      fields: [f({ name: 'AMT', type: 'number' })],
    }
    const q = analyzeQuality(obj, { technicalNames: ['AMT'], rows: [['1'], ['1000000']] })
    expect(q.anomalies).toEqual([])
  })
})
