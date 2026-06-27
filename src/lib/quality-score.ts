// Data-quality scoring (0–100) for migration objects and whole projects.
// Pure and dependency-free for unit testing. Scores are derived from real
// signals the platform already tracks: template upload, validation results,
// mapping coverage, and required-field readiness.

export interface ObjectQualityInput {
  status: string // PENDING | MAPPED | READY | DONE
  hasTemplate: boolean
  mappingCount: number
  validation?: {
    totalRows: number
    validRows: number
    errorRows: number
    warningRows: number
  } | null
}

export interface QualityBreakdown {
  score: number // 0..100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  factors: { label: string; score: number; weight: number }[]
}

function grade(score: number): QualityBreakdown['grade'] {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

/**
 * Weighted object quality score:
 *  - Readiness (status)        25%
 *  - Template uploaded         20%
 *  - Validation pass rate      40%
 *  - Has value mappings        15%
 */
export function scoreObject(input: ObjectQualityInput): QualityBreakdown {
  const statusScore =
    input.status === 'DONE' ? 100 :
    input.status === 'READY' ? 85 :
    input.status === 'MAPPED' ? 55 : 20

  const templateScore = input.hasTemplate ? 100 : 0

  let validationScore = input.hasTemplate ? 50 : 0 // unknown until validated
  if (input.validation && input.validation.totalRows > 0) {
    const { totalRows, validRows, warningRows } = input.validation
    // valid rows count fully; warning-only rows count 70%
    validationScore = Math.round(((validRows + warningRows * 0.7) / totalRows) * 100)
    validationScore = Math.max(0, Math.min(100, validationScore))
  }

  const mappingScore = input.mappingCount > 0 ? 100 : 50 // mappings optional, mild credit

  const factors = [
    { label: 'Readiness', score: statusScore, weight: 0.25 },
    { label: 'Template uploaded', score: templateScore, weight: 0.2 },
    { label: 'Validation pass rate', score: validationScore, weight: 0.4 },
    { label: 'Value mappings', score: mappingScore, weight: 0.15 },
  ]

  const score = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0))
  return { score, grade: grade(score), factors }
}

export interface ProjectQualityInput {
  objects: ObjectQualityInput[]
}

export function scoreProject(input: ProjectQualityInput): QualityBreakdown & { objectCount: number } {
  if (input.objects.length === 0) {
    return { score: 0, grade: 'F', factors: [], objectCount: 0 }
  }
  const perObject = input.objects.map(scoreObject)
  const score = Math.round(perObject.reduce((s, o) => s + o.score, 0) / perObject.length)
  return { score, grade: grade(score), factors: [], objectCount: input.objects.length }
}
