// Shared CSV utilities used by import/export routes.
// Kept dependency-free so they can be unit-tested in isolation.

/** Parse CSV text into a 2D array of strings. Handles quoted fields,
 *  escaped quotes ("") and commas inside quotes. Skips blank lines. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  for (const line of lines) {
    const cells: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuote = !inQuote
        }
      } else if (ch === ',' && !inQuote) {
        cells.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
    cells.push(cur)
    rows.push(cells)
  }
  return rows
}

/** Escape a single value for CSV output (always quoted). */
export function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

/** Serialize a 2D array of values into CSV text. */
export function toCSV(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n')
}

export interface MappingRow {
  objectKey: string
  fieldName: string
  fieldLabel?: string
  sourceValue: string
  targetValue: string
}

export interface MappingParseResult {
  /** Valid, complete rows ready to look up + persist. */
  rows: MappingRow[]
  /** Header was missing one or more required columns. */
  error?: string
}

const REQUIRED_HEADERS = ['object key', 'field name', 'source value', 'target value']

/** Parse a mappings CSV (with header) into structured rows.
 *  Returns an error string if required columns are missing. */
export function parseMappingsCSV(text: string): MappingParseResult {
  const rows = parseCSV(text)
  if (rows.length < 2) {
    return { rows: [], error: 'CSV must have a header and at least one data row' }
  }

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const idx = {
    objectKey: header.indexOf('object key'),
    fieldName: header.indexOf('field name'),
    fieldLabel: header.indexOf('field label'),
    sourceValue: header.indexOf('source value'),
    targetValue: header.indexOf('target value'),
  }

  const missing = REQUIRED_HEADERS.filter((h) => header.indexOf(h) < 0)
  if (missing.length > 0) {
    return { rows: [], error: 'CSV must have columns: Object Key, Field Name, Source Value, Target Value' }
  }

  const out: MappingRow[] = []
  for (const row of rows.slice(1)) {
    const objectKey = row[idx.objectKey]?.trim()
    const fieldName = row[idx.fieldName]?.trim()
    const sourceValue = row[idx.sourceValue]?.trim()
    const targetValue = row[idx.targetValue]?.trim()
    if (!objectKey || !fieldName || !sourceValue || !targetValue) continue
    out.push({
      objectKey,
      fieldName,
      sourceValue,
      targetValue,
      fieldLabel: idx.fieldLabel >= 0 ? row[idx.fieldLabel]?.trim() || undefined : undefined,
    })
  }

  return { rows: out }
}
