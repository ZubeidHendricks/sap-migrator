import { describe, it, expect } from 'vitest'
import { estimateTimeline, addWorkingDays } from '@/lib/timeline'

describe('estimateTimeline', () => {
  it('returns zero work when everything is ready', () => {
    const t = estimateTimeline({ totalObjects: 10, readyObjects: 10, avgErrorRate: 0, teamSize: 2 })
    expect(t.remainingObjects).toBe(0)
    expect(t.estimatedDays).toBe(0)
    expect(t.summary).toMatch(/no preparation work/i)
  })

  it('estimates more days for more remaining objects', () => {
    const few = estimateTimeline({ totalObjects: 5, readyObjects: 4, avgErrorRate: 0, teamSize: 1 })
    const many = estimateTimeline({ totalObjects: 50, readyObjects: 0, avgErrorRate: 0, teamSize: 1 })
    expect(many.estimatedDays).toBeGreaterThan(few.estimatedDays)
  })

  it('a larger team finishes faster', () => {
    const solo = estimateTimeline({ totalObjects: 40, readyObjects: 0, avgErrorRate: 0, teamSize: 1 })
    const squad = estimateTimeline({ totalObjects: 40, readyObjects: 0, avgErrorRate: 0, teamSize: 5 })
    expect(squad.estimatedDays).toBeLessThan(solo.estimatedDays)
  })

  it('higher error rate increases effort and lowers confidence', () => {
    const clean = estimateTimeline({ totalObjects: 20, readyObjects: 0, avgErrorRate: 0, teamSize: 2 })
    const messy = estimateTimeline({ totalObjects: 20, readyObjects: 0, avgErrorRate: 0.5, teamSize: 2 })
    expect(messy.estimatedHours).toBeGreaterThan(clean.estimatedHours)
    expect(clean.confidence).toBe('High')
    expect(messy.confidence).toBe('Low')
  })

  it('clamps invalid inputs (ready > total, team < 1)', () => {
    const t = estimateTimeline({ totalObjects: 5, readyObjects: 99, avgErrorRate: 2, teamSize: 0 })
    expect(t.remainingObjects).toBe(0)
    expect(t.estimatedDays).toBe(0)
  })
})

describe('addWorkingDays', () => {
  it('skips weekends', () => {
    // 2026-06-26 is a Friday; +1 working day → Monday 2026-06-29
    const mon = addWorkingDays(new Date('2026-06-26T00:00:00Z'), 1)
    expect(mon.getDay()).not.toBe(0)
    expect(mon.getDay()).not.toBe(6)
  })
  it('returns the same date for zero days', () => {
    const d = new Date('2026-06-25T00:00:00Z')
    expect(addWorkingDays(d, 0).getTime()).toBe(d.getTime())
  })
})
