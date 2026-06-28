import { describe, it, expect } from 'vitest'
import { generateProjectReportPdf, type ProjectReportData } from '@/lib/pdf-report'

const data: ProjectReportData = {
  projectName: 'Q3 Migration',
  status: 'IN_PROGRESS',
  approach: 'Staging Tables',
  generatedAt: 'Jun 28, 2026',
  quality: { score: 72, grade: 'B' },
  stats: { objects: 3, mapped: 2, done: 1, runs: 2, readinessPct: 33 },
  objects: [
    { objectKey: 'GL_ACCOUNT', objectName: 'General Ledger Account', category: 'Finance', status: 'DONE' },
    { objectKey: 'CUSTOMER', objectName: 'Customer Master', category: 'Master Data', status: 'READY' },
  ],
  runs: [
    { type: 'SIMULATION', status: 'COMPLETED', totalRecords: 100, successCount: 95, errorCount: 5, createdAt: 'Jun 27, 2026' },
  ],
  orgName: 'Acme Corp',
}

describe('generateProjectReportPdf', () => {
  it('produces a valid PDF byte stream', async () => {
    const bytes = await generateProjectReportPdf(data)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(500)
    // PDF magic header: %PDF
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x25, 0x50, 0x44, 0x46])
  })

  it('handles an empty project (no objects or runs)', async () => {
    const bytes = await generateProjectReportPdf({
      ...data,
      objects: [], runs: [], stats: { objects: 0, mapped: 0, done: 0, runs: 0, readinessPct: 0 },
    })
    expect(bytes.length).toBeGreaterThan(400)
  })

  it('paginates a large object list without throwing', async () => {
    const many = Array.from({ length: 80 }, (_, i) => ({
      objectKey: `OBJ_${i}`, objectName: `Object number ${i} with a long-ish name`, category: 'Finance', status: 'PENDING',
    }))
    const bytes = await generateProjectReportPdf({ ...data, objects: many })
    expect(bytes.length).toBeGreaterThan(1000)
  })
})
