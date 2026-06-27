import { describe, it, expect } from 'vitest'
import { scoreObject, scoreProject } from '@/lib/quality-score'

describe('scoreObject', () => {
  it('scores a fully-done, clean object highly (grade A/B)', () => {
    const r = scoreObject({
      status: 'DONE',
      hasTemplate: true,
      mappingCount: 3,
      validation: { totalRows: 100, validRows: 100, errorRows: 0, warningRows: 0 },
    })
    expect(r.score).toBeGreaterThanOrEqual(90)
    expect(r.grade).toBe('A')
  })

  it('scores an untouched object low (grade F)', () => {
    const r = scoreObject({ status: 'PENDING', hasTemplate: false, mappingCount: 0, validation: null })
    expect(r.score).toBeLessThan(40)
    expect(r.grade).toBe('F')
  })

  it('penalizes high error rates in validation', () => {
    const clean = scoreObject({ status: 'READY', hasTemplate: true, mappingCount: 1, validation: { totalRows: 100, validRows: 100, errorRows: 0, warningRows: 0 } })
    const dirty = scoreObject({ status: 'READY', hasTemplate: true, mappingCount: 1, validation: { totalRows: 100, validRows: 40, errorRows: 60, warningRows: 0 } })
    expect(dirty.score).toBeLessThan(clean.score)
  })

  it('gives partial credit for warnings vs errors', () => {
    const warn = scoreObject({ status: 'READY', hasTemplate: true, mappingCount: 1, validation: { totalRows: 100, validRows: 0, errorRows: 0, warningRows: 100 } })
    const err = scoreObject({ status: 'READY', hasTemplate: true, mappingCount: 1, validation: { totalRows: 100, validRows: 0, errorRows: 100, warningRows: 0 } })
    expect(warn.score).toBeGreaterThan(err.score)
  })

  it('always returns 4 weighted factors summing weight to 1', () => {
    const r = scoreObject({ status: 'MAPPED', hasTemplate: false, mappingCount: 0, validation: null })
    expect(r.factors).toHaveLength(4)
    expect(r.factors.reduce((s, f) => s + f.weight, 0)).toBeCloseTo(1)
  })
})

describe('scoreProject', () => {
  it('averages object scores', () => {
    const r = scoreProject({ objects: [
      { status: 'DONE', hasTemplate: true, mappingCount: 1, validation: { totalRows: 10, validRows: 10, errorRows: 0, warningRows: 0 } },
      { status: 'PENDING', hasTemplate: false, mappingCount: 0, validation: null },
    ] })
    expect(r.objectCount).toBe(2)
    expect(r.score).toBeGreaterThan(0)
    expect(r.score).toBeLessThan(100)
  })

  it('handles an empty project', () => {
    const r = scoreProject({ objects: [] })
    expect(r.score).toBe(0)
    expect(r.grade).toBe('F')
  })
})
