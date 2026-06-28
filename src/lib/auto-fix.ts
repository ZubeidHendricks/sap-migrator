// Deterministic auto-fix for failed validation cells. Given a field and an
// offending value, propose a corrected value for the common, unambiguous cases
// (length, numeric, date format, boolean). Pure and unit-tested; the LLM fixer
// (llm-auto-fix) falls back to this.

import type { MigrationObjectField } from './migration-objects'

export interface FixSuggestion {
  suggested: string
  explanation: string
}

const NUMBER_RE = /^-?\d+(\.\d+)?$/
const DATE_OK_RE = /^(\d{4}-\d{2}-\d{2}|\d{8})$/

function reformatDate(value: string): string | null {
  const v = value.trim()
  // YYYY/MM/DD or YYYY.MM.DD → YYYY-MM-DD
  let m = v.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  // DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY → YYYY-MM-DD (day-first)
  m = v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (m) {
    let d = parseInt(m[1], 10), mo = parseInt(m[2], 10)
    // If the first token can't be a day but the second can, swap (handles MM/DD/YYYY).
    if (d > 12 && mo <= 12) { /* day-first, fine */ }
    else if (d <= 12 && mo > 12) { const t = d; d = mo; mo = t }
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
      return `${m[3]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }
  return null
}

/** Propose a fix for a single field value. Returns null if it can't be auto-fixed
 *  (e.g. a missing required value, which needs human input). */
export function autoFix(field: MigrationObjectField, rawValue: string): FixSuggestion | null {
  const value = (rawValue ?? '').trim()
  if (value === '') return null // missing required — can't invent data

  // Over-length → truncate.
  if (field.maxLength != null && value.length > field.maxLength) {
    return { suggested: value.slice(0, field.maxLength), explanation: `Truncated to ${field.maxLength} characters` }
  }

  if (field.type === 'number' && !NUMBER_RE.test(value)) {
    // Strip currency symbols / thousands separators / spaces.
    const cleaned = value.replace(/[^\d.-]/g, '')
    if (NUMBER_RE.test(cleaned)) return { suggested: cleaned, explanation: 'Removed non-numeric characters' }
    return null
  }

  if (field.type === 'date' && !DATE_OK_RE.test(value)) {
    const fixed = reformatDate(value)
    if (fixed) return { suggested: fixed, explanation: 'Reformatted to YYYY-MM-DD' }
    return null
  }

  if (field.type === 'boolean' && value !== 'X') {
    const n = value.toLowerCase()
    if (['x', 'yes', 'y', 'true', '1'].includes(n)) return { suggested: 'X', explanation: 'Normalized to SAP flag "X"' }
    if (['no', 'n', 'false', '0'].includes(n)) return { suggested: '', explanation: 'Normalized to empty flag' }
    return null
  }

  return null
}

export interface FixInput { row: number; field: string; value: string }
export interface FixResult { row: number; field: string; value: string; suggested: string; explanation: string }

/** Apply deterministic fixes to a batch, returning only those that could be fixed. */
export function autoFixBatch(fieldsByName: Record<string, MigrationObjectField>, inputs: FixInput[]): FixResult[] {
  const out: FixResult[] = []
  for (const it of inputs) {
    const field = fieldsByName[it.field]
    if (!field) continue
    const fix = autoFix(field, it.value ?? '')
    if (fix) out.push({ row: it.row, field: it.field, value: it.value, suggested: fix.suggested, explanation: fix.explanation })
  }
  return out
}
