// Duplicate & anomaly detection for an uploaded template. Flags duplicate key
// values (a common cause of load failures) and per-field outliers (numeric
// z-score, and format/pattern deviations). Pure and unit-tested; computed at
// upload time and stored alongside the profile.

import type { MigrationObject } from './migration-objects'
import type { ParsedSpreadsheet } from './validation-rules'

export interface DuplicateGroup { value: string; rows: number[]; count: number }
export interface Anomaly { field: string; row: number; value: string; kind: 'numeric_outlier' | 'format_outlier'; detail: string }

export interface QualityFlags {
  keyField: string | null
  keyLabel: string | null
  duplicates: DuplicateGroup[]
  duplicateRowCount: number
  anomalies: Anomaly[]
}

const NUMBER_RE = /^-?\d+(\.\d+)?$/

/** Collapse a value into a character-class signature: A=alpha, 9=digit, .=other,
 *  with consecutive same-class runs collapsed (e.g. "0001000000" -> "9"). */
export function patternSignature(value: string): string {
  let sig = ''
  let last = ''
  for (const ch of value) {
    const c = /[A-Za-z]/.test(ch) ? 'A' : /[0-9]/.test(ch) ? '9' : '.'
    if (c !== last) { sig += c; last = c }
  }
  return sig
}

function nonEmptyRows(parsed: ParsedSpreadsheet): string[][] {
  return parsed.rows.filter((r) => !r.every((c) => (c ?? '').trim() === ''))
}

export function analyzeQuality(object: MigrationObject, parsed: ParsedSpreadsheet, maxItems = 50): QualityFlags {
  const colIndex: Record<string, number> = {}
  parsed.technicalNames.forEach((n, i) => { colIndex[n] = i })
  const rows = nonEmptyRows(parsed)

  // ── Duplicate key detection (first field is treated as the natural key) ──
  const keyFieldDef = object.fields[0] ?? null
  let duplicates: DuplicateGroup[] = []
  let duplicateRowCount = 0
  if (keyFieldDef && colIndex[keyFieldDef.name] != null) {
    const idx = colIndex[keyFieldDef.name]
    const map = new Map<string, number[]>()
    rows.forEach((r, i) => {
      const v = (r[idx] ?? '').trim()
      if (v === '') return
      const arr = map.get(v) ?? []
      arr.push(i + 1)
      map.set(v, arr)
    })
    duplicates = [...map.entries()]
      .filter(([, r]) => r.length > 1)
      .map(([value, r]) => ({ value, rows: r, count: r.length }))
      .sort((a, b) => b.count - a.count)
    duplicateRowCount = duplicates.reduce((s, g) => s + g.count, 0)
    duplicates = duplicates.slice(0, maxItems)
  }

  // ── Per-field anomalies ──
  const anomalies: Anomaly[] = []
  for (const f of object.fields) {
    const idx = colIndex[f.name]
    if (idx == null) continue
    const cells: { row: number; value: string }[] = []
    rows.forEach((r, i) => {
      const v = (r[idx] ?? '').trim()
      if (v !== '') cells.push({ row: i + 1, value: v })
    })
    if (cells.length < 8) continue

    if (f.type === 'number') {
      const nums = cells.filter((c) => NUMBER_RE.test(c.value)).map((c) => ({ ...c, n: parseFloat(c.value) }))
      if (nums.length >= 8) {
        // Robust outlier detection via median + MAD (modified z-score). A single
        // extreme value can't inflate the spread the way mean/std would, so it
        // still gets flagged even in small samples.
        const median = (arr: number[]) => {
          const s = [...arr].sort((a, b) => a - b)
          const m = Math.floor(s.length / 2)
          return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
        }
        const med = median(nums.map((x) => x.n))
        const mad = median(nums.map((x) => Math.abs(x.n - med)))
        if (mad > 0) {
          for (const x of nums) {
            const mz = (0.6745 * (x.n - med)) / mad
            if (Math.abs(mz) > 3.5) anomalies.push({ field: f.name, row: x.row, value: x.value, kind: 'numeric_outlier', detail: `outlier vs median ${med}` })
          }
        }
      }
    } else {
      // Format outlier: when one signature dominates, flag the deviations.
      const sigCount = new Map<string, number>()
      for (const c of cells) sigCount.set(patternSignature(c.value), (sigCount.get(patternSignature(c.value)) ?? 0) + 1)
      const [domSig, domN] = [...sigCount.entries()].sort((a, b) => b[1] - a[1])[0]
      if (domN / cells.length >= 0.8 && sigCount.size > 1) {
        for (const c of cells) {
          if (patternSignature(c.value) !== domSig) {
            anomalies.push({ field: f.name, row: c.row, value: c.value, kind: 'format_outlier', detail: `unusual format vs the common pattern` })
          }
        }
      }
    }
    if (anomalies.length >= maxItems) break
  }

  return {
    keyField: keyFieldDef?.name ?? null,
    keyLabel: keyFieldDef?.label ?? null,
    duplicates,
    duplicateRowCount,
    anomalies: anomalies.slice(0, maxItems),
  }
}
