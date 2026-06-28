// Stand-in SAP data source: generates structured sample rows from an object's
// field definitions. This is the seam where a real RFC / Migration Cockpit
// reader will slot in (Phase 5). Deterministic per (objectKey, row, field) so
// output is stable and unit-testable.

import type { MigrationObject, MigrationObjectField } from '../migration-objects'

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function sampleValue(field: MigrationObjectField, seed: string): string {
  const h = hash(seed)
  if (field.type === 'number') return String(h % 100000)
  if (field.type === 'boolean') return h % 2 === 0 ? 'X' : ''
  if (field.type === 'date') {
    const y = 2020 + (h % 6)
    const m = String((h % 12) + 1).padStart(2, '0')
    const d = String((h % 28) + 1).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  // string: prefer the field's example, else a short deterministic token
  const base = field.example && field.example.trim() ? field.example.trim() : `${field.name}_${h % 1000}`
  return field.maxLength ? base.slice(0, field.maxLength) : base
}

export interface ExtractedData {
  fields: MigrationObjectField[]
  rows: Record<string, string>[]
}

/** Generate `count` deterministic sample rows for an object. */
export function generateSampleRows(object: MigrationObject, count: number): ExtractedData {
  const rows: Record<string, string>[] = []
  for (let i = 0; i < count; i++) {
    const row: Record<string, string> = {}
    for (const f of object.fields) {
      row[f.name] = sampleValue(f, `${object.key}:${i}:${f.name}`)
    }
    rows.push(row)
  }
  return { fields: object.fields, rows }
}
