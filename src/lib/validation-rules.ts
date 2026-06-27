// Pre-upload data validation. Parses an uploaded MS Excel XML Spreadsheet 2003
// file and validates each data row against the object's SAP field definitions,
// catching the common errors that make SAP Migration Cockpit loads fail.
// Dependency-free so it can be unit-tested in isolation.

import type { MigrationObject, MigrationObjectField } from './migration-objects'

export interface ParsedSpreadsheet {
  /** Technical field names from row 2 of the template. */
  technicalNames: string[]
  /** Data rows (everything after the two header rows), aligned to technicalNames. */
  rows: string[][]
}

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

/** Parse an Excel 2003 XML Spreadsheet. Row 1 = labels, row 2 = technical names,
 *  rows 3+ = data. Only the first worksheet (the data sheet) is parsed. */
export function parseXmlSpreadsheet(xml: string): ParsedSpreadsheet {
  // Limit to the first worksheet so the "Field Guide" sheet isn't treated as data.
  const firstSheet = xml.split('</Worksheet>')[0] ?? xml
  const rowBlocks = firstSheet.match(/<Row[\s>][\s\S]*?<\/Row>/g) ?? []

  const parsedRows: string[][] = rowBlocks.map((block) => {
    const cells = block.match(/<Data[^>]*>([\s\S]*?)<\/Data>/g) ?? []
    return cells.map((c) => {
      const m = c.match(/<Data[^>]*>([\s\S]*?)<\/Data>/)
      return m ? unescapeXml(m[1]).trim() : ''
    })
  })

  if (parsedRows.length < 2) return { technicalNames: [], rows: [] }

  const technicalNames = parsedRows[1]
  const rows = parsedRows.slice(2)
  return { technicalNames, rows }
}

export type IssueSeverity = 'ERROR' | 'WARNING'

export interface ValidationIssue {
  row: number // 1-based data row number
  field: string // technical field name
  severity: IssueSeverity
  message: string
}

export interface ValidationSummary {
  totalRows: number
  validRows: number
  errorRows: number
  warningRows: number
  issues: ValidationIssue[]
}

const DATE_RE = /^(\d{4}-\d{2}-\d{2}|\d{8})$/ // YYYY-MM-DD or YYYYMMDD
const NUMBER_RE = /^-?\d+(\.\d+)?$/

/** Validate one field's value. Returns an issue or null. */
export function validateField(field: MigrationObjectField, rawValue: string | undefined): ValidationIssue | null {
  const value = (rawValue ?? '').trim()

  if (value === '') {
    if (field.required) {
      return { row: 0, field: field.name, severity: 'ERROR', message: `Required field ${field.name} is missing` }
    }
    return null // empty optional field — nothing to check
  }

  if (field.maxLength != null && value.length > field.maxLength) {
    return { row: 0, field: field.name, severity: 'ERROR', message: `${field.name} exceeds maximum length of ${field.maxLength} (got ${value.length})` }
  }

  if (field.type === 'number' && !NUMBER_RE.test(value)) {
    return { row: 0, field: field.name, severity: 'ERROR', message: `${field.name} must be numeric (got "${value}")` }
  }

  if (field.type === 'date' && !DATE_RE.test(value)) {
    return { row: 0, field: field.name, severity: 'ERROR', message: `${field.name} must be a date as YYYY-MM-DD or YYYYMMDD (got "${value}")` }
  }

  if (field.type === 'boolean' && value !== 'X' && value.toLowerCase() !== 'x') {
    return { row: 0, field: field.name, severity: 'WARNING', message: `${field.name} should be "X" or blank (got "${value}")` }
  }

  return null
}

/** Validate all parsed rows against an object's field definitions. */
export function validateRows(object: MigrationObject, parsed: ParsedSpreadsheet): ValidationSummary {
  const issues: ValidationIssue[] = []
  const rowsWithError = new Set<number>()
  const rowsWithWarning = new Set<number>()

  // Map each field to its column index by technical name.
  const colIndex: Record<string, number> = {}
  parsed.technicalNames.forEach((name, i) => { colIndex[name] = i })

  parsed.rows.forEach((row, r) => {
    const rowNum = r + 1
    // Skip fully-empty rows (trailing blanks in spreadsheets).
    if (row.every((c) => (c ?? '').trim() === '')) return

    for (const field of object.fields) {
      const idx = colIndex[field.name]
      const value = idx != null ? row[idx] : undefined
      const issue = validateField(field, value)
      if (issue) {
        issue.row = rowNum
        issues.push(issue)
        if (issue.severity === 'ERROR') rowsWithError.add(rowNum)
        else rowsWithWarning.add(rowNum)
      }
    }
  })

  const nonEmptyRows = parsed.rows.filter((row) => !row.every((c) => (c ?? '').trim() === '')).length
  const errorRows = rowsWithError.size
  const warningRows = rowsWithWarning.size
  const validRows = Math.max(0, nonEmptyRows - errorRows)

  return { totalRows: nonEmptyRows, validRows, errorRows, warningRows, issues }
}

/** Convenience: parse + validate in one call. */
export function validateSpreadsheet(object: MigrationObject, xml: string): ValidationSummary {
  return validateRows(object, parseXmlSpreadsheet(xml))
}
