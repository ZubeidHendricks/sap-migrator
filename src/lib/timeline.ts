// Migration timeline planner: estimate the effort and a realistic go-live
// readiness date from object count, current readiness, error rate, and team
// size. Pure and deterministic for unit testing.

export interface TimelineInput {
  totalObjects: number
  readyObjects: number // objects at READY or DONE
  avgErrorRate: number // 0..1 across recent runs
  teamSize: number // number of active migrators (>=1)
  /** Working hours available per person per day (default 6 productive hours). */
  hoursPerPersonPerDay?: number
}

export interface TimelineEstimate {
  remainingObjects: number
  /** Estimated effort in person-hours to get remaining objects to READY. */
  estimatedHours: number
  /** Estimated working days given the team size. */
  estimatedDays: number
  /** Confidence label based on how much error-correction rework is expected. */
  confidence: 'High' | 'Medium' | 'Low'
  /** Human summary. */
  summary: string
}

// Base effort to prepare one object (map + template + validate + fix): ~4h.
const BASE_HOURS_PER_OBJECT = 4

export function estimateTimeline(input: TimelineInput): TimelineEstimate {
  const totalObjects = Math.max(0, input.totalObjects)
  const readyObjects = Math.max(0, Math.min(input.readyObjects, totalObjects))
  const remaining = totalObjects - readyObjects
  const team = Math.max(1, input.teamSize)
  const hoursPerDay = input.hoursPerPersonPerDay ?? 6
  const errorRate = Math.max(0, Math.min(1, input.avgErrorRate || 0))

  // Each point of error rate adds rework. At 0% errors → base; at 100% → 2.5x.
  const reworkMultiplier = 1 + errorRate * 1.5
  const estimatedHours = Math.round(remaining * BASE_HOURS_PER_OBJECT * reworkMultiplier)
  const estimatedDays = remaining === 0 ? 0 : Math.ceil(estimatedHours / (team * hoursPerDay))

  const confidence: TimelineEstimate['confidence'] =
    errorRate <= 0.05 ? 'High' : errorRate <= 0.2 ? 'Medium' : 'Low'

  const summary =
    remaining === 0
      ? 'All objects are ready — no preparation work remaining.'
      : `~${estimatedDays} working day${estimatedDays !== 1 ? 's' : ''} for a team of ${team} to prepare ${remaining} remaining object${remaining !== 1 ? 's' : ''} (${Math.round(errorRate * 100)}% error rate factored in).`

  return { remainingObjects: remaining, estimatedHours, estimatedDays, confidence, summary }
}

/** Add N working days (Mon–Fri) to a starting date. */
export function addWorkingDays(start: Date, days: number): Date {
  const d = new Date(start.getTime())
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) added++
  }
  return d
}
