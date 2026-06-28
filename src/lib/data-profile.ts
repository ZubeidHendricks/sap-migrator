// Data profiling: per-field statistics for an uploaded template (fill rate,
// distinct values, top values, length range, numeric range). Pure and
// unit-tested; computed at upload time and stored on the template.

import type { MigrationObject, MigrationObjectField } from './migration-objects'
import type { ParsedSpreadsheet } from './validation-rules'

export interface FieldProfile {
  name: string
  label: string
  type: string
  required: boolean
  fillRate: number // 0..1 (non-empty / total rows)
  blankCount: number
  distinctCount: number
  minLength: number
  maxLength: number
  topValues: { value: string; count: number }[]
  numeric?: { min: number; max: number; avg: number }
}

export interface DataProfile {
  rowCount: number
  fields: FieldProfile[]
}

const NUMBER_RE = /^-?\d+(\.\d+)?$/

export function profileRows(object: MigrationObject, parsed: ParsedSpreadsheet): DataProfile {
  const colIndex: Record<string, number> = {}
  parsed.technicalNames.forEach((n, i) => { colIndex[n] = i })

  // Non-empty data rows only.
  const rows = parsed.rows.filter((r) => !r.every((c) => (c ?? '').trim() === ''))
  const rowCount = rows.length

  const fields: FieldProfile[] = object.fields.map((f: MigrationObjectField) => {
    const idx = colIndex[f.name]
    const values: string[] = []
    for (const r of rows) {
      const v = (idx != null ? r[idx] : '') ?? ''
      values.push(v.trim())
    }
    const nonEmpty = values.filter((v) => v !== '')
    const blankCount = rowCount - nonEmpty.length

    const counts = new Map<string, number>()
    let minLength = Infinity, maxLength = 0
    const nums: number[] = []
    for (const v of nonEmpty) {
      counts.set(v, (counts.get(v) ?? 0) + 1)
      if (v.length < minLength) minLength = v.length
      if (v.length > maxLength) maxLength = v.length
      if (f.type === 'number' && NUMBER_RE.test(v)) nums.push(parseFloat(v))
    }

    const topValues = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }))

    const profile: FieldProfile = {
      name: f.name,
      label: f.label,
      type: f.type,
      required: f.required,
      fillRate: rowCount === 0 ? 0 : Math.round((nonEmpty.length / rowCount) * 1000) / 1000,
      blankCount,
      distinctCount: counts.size,
      minLength: nonEmpty.length === 0 ? 0 : minLength,
      maxLength,
      topValues,
    }

    if (nums.length > 0) {
      const sum = nums.reduce((s, n) => s + n, 0)
      profile.numeric = {
        min: Math.min(...nums),
        max: Math.max(...nums),
        avg: Math.round((sum / nums.length) * 100) / 100,
      }
    }
    return profile
  })

  return { rowCount, fields }
}
