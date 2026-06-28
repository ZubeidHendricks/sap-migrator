import { describe, it, expect } from 'vitest'
import { buildSnapshot, buildQueryPrompt, summarize, type SnapshotInput } from '@/lib/nl-query'

const base: SnapshotInput = {
  name: 'Q3 Migration', status: 'IN_PROGRESS', approach: 'STAGING_TABLES', goLiveDate: new Date('2026-09-01T00:00:00Z'),
  objects: [
    {
      objectKey: 'GL_ACCOUNT', objectName: 'GL Account', category: 'Finance', status: 'READY',
      assignedToId: 'u1', mappingCount: 2,
      template: { rowCount: 100, validationErrors: { errorRows: 0, warningRows: 3 }, profile: { fields: [{ fillRate: 1 }, { fillRate: 0.5 }] }, qualityFlags: { duplicateRowCount: 0, anomalies: [] } },
    },
    {
      objectKey: 'CUSTOMER', objectName: 'Customer', category: 'Master Data', status: 'PENDING',
      assignedToId: null, mappingCount: 0,
      template: { rowCount: 50, validationErrors: { errorRows: 5, warningRows: 0 }, profile: null, qualityFlags: { duplicateRowCount: 2, anomalies: [{}, {}] } },
    },
  ],
  runs: [
    { type: 'MIGRATION', status: 'COMPLETED', totalRecords: 100, successCount: 95, errorCount: 5, createdAt: new Date('2026-06-27') },
    { type: 'SIMULATION', status: 'COMPLETED', totalRecords: 100, successCount: 100, errorCount: 0, createdAt: new Date('2026-06-26') },
  ],
}

describe('buildSnapshot', () => {
  const s = buildSnapshot(base)

  it('summarizes project + totals', () => {
    expect(s.project).toMatchObject({ name: 'Q3 Migration', goLiveDate: '2026-09-01' })
    expect(s.totals.objects).toBe(2)
    expect(s.totals.ready).toBe(1) // GL_ACCOUNT READY
    expect(s.totals.assigned).toBe(1)
    expect(s.totals.recordsMigrated).toBe(95) // completed MIGRATION successes
  })

  it('derives per-object quality signals', () => {
    const cust = s.objects.find((o) => o.key === 'CUSTOMER')!
    expect(cust.errorRows).toBe(5)
    expect(cust.duplicateRows).toBe(2)
    expect(cust.anomalies).toBe(2)
    expect(cust.assigned).toBe(false)
  })

  it('averages fill rate from the profile', () => {
    const gl = s.objects.find((o) => o.key === 'GL_ACCOUNT')!
    expect(gl.fillRateAvg).toBe(0.75) // (1 + 0.5) / 2
  })

  it('summarizes runs', () => {
    expect(s.runs.total).toBe(2)
    expect(s.runs.byStatus.COMPLETED).toBe(2)
    expect(s.runs.last).toMatchObject({ type: 'MIGRATION', success: 95 })
  })

  it('handles objects without a template', () => {
    const s2 = buildSnapshot({ ...base, objects: [{ objectKey: 'X', objectName: 'X', category: 'Basis', status: 'PENDING', assignedToId: null, mappingCount: 0, template: null }] })
    expect(s2.objects[0].hasTemplate).toBe(false)
    expect(s2.objects[0].fillRateAvg).toBeNull()
  })
})

describe('buildQueryPrompt', () => {
  it('embeds the question and the snapshot JSON and forbids invention', () => {
    const p = buildQueryPrompt('which objects have errors?', buildSnapshot(base))
    expect(p).toContain('which objects have errors?')
    expect(p).toContain('"CUSTOMER"')
    expect(p).toMatch(/ONLY the JSON snapshot/i)
  })
})

describe('summarize (fallback)', () => {
  it('produces a useful deterministic summary', () => {
    const out = summarize(buildSnapshot(base))
    expect(out).toContain('Customer') // has errors
    expect(out).toMatch(/no owner|object\(s\) have no owner/i)
  })
})
