// Pure SQL helpers for the PostgreSQL extract target. Kept dependency-free and
// unit-tested; the actual connection lives in postgres-target.ts.

import type { MigrationObjectField } from '../migration-objects'

/** Sanitize an identifier (table/column) to a safe lowercase snake form. */
export function sanitizeIdentifier(name: string): string {
  let s = name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
  if (!s) s = 'col'
  if (/^[0-9]/.test(s)) s = `c_${s}`
  return s.slice(0, 63) // Postgres identifier limit
}

/** Map a migration field type to a PostgreSQL column type. */
export function pgColumnType(field: MigrationObjectField): string {
  if (field.type === 'number') return 'NUMERIC'
  if (field.type === 'string' && field.maxLength && field.maxLength > 0) return `VARCHAR(${field.maxLength})`
  // SAP date/boolean formats vary (YYYYMMDD, 'X'/''), store as TEXT to avoid load failures
  return 'TEXT'
}

/** Build a CREATE TABLE IF NOT EXISTS statement for an object's fields. */
export function buildCreateTable(tableName: string, fields: MigrationObjectField[]): string {
  const table = sanitizeIdentifier(tableName)
  const cols = fields.map((f) => `  "${sanitizeIdentifier(f.name)}" ${pgColumnType(f)}`)
  return `CREATE TABLE IF NOT EXISTS "${table}" (\n${cols.join(',\n')}\n);`
}

/** Build a parameterized multi-row INSERT and its flat value array. */
export function buildInsert(
  tableName: string,
  fields: MigrationObjectField[],
  rows: Record<string, string>[],
): { text: string; values: (string | null)[] } {
  const table = sanitizeIdentifier(tableName)
  const cols = fields.map((f) => `"${sanitizeIdentifier(f.name)}"`)
  const values: (string | null)[] = []
  const tuples: string[] = []
  let p = 1
  for (const row of rows) {
    const placeholders = fields.map(() => `$${p++}`)
    tuples.push(`(${placeholders.join(', ')})`)
    for (const f of fields) {
      const v = row[f.name]
      values.push(v === undefined || v === '' ? null : v)
    }
  }
  const text = `INSERT INTO "${table}" (${cols.join(', ')}) VALUES ${tuples.join(', ')};`
  return { text, values }
}
