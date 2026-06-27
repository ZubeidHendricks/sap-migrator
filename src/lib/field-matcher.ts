// Smart field-mapping suggestions: given a list of source-system column headers,
// suggest the best-matching SAP target fields for an object, with confidence
// scores and a human-readable reason. Deterministic and dependency-free so it
// can be unit-tested; an LLM layer can be slotted in later behind the same API.

import type { MigrationObject, MigrationObjectField } from './migration-objects'

// Common source-header → SAP-concept synonyms. Keyed by normalized tokens that
// frequently appear in legacy exports; values are SAP technical field names.
const SYNONYMS: Record<string, string[]> = {
  company: ['BUKRS'],
  companycode: ['BUKRS'],
  account: ['SAKNR', 'KTOPL', 'HKONT'],
  glaccount: ['SAKNR'],
  currency: ['WAERS', 'CURT'],
  customer: ['KUNNR'],
  vendor: ['LIFNR'],
  supplier: ['LIFNR'],
  material: ['MATNR'],
  plant: ['WERKS'],
  costcenter: ['KOSTL'],
  costcentre: ['KOSTL'],
  profitcenter: ['PRCTR'],
  profitcentre: ['PRCTR'],
  name: ['NAME1', 'TXT50', 'MAKTX'],
  description: ['TXT50', 'MAKTX', 'TXT20'],
  text: ['TXT50', 'TXT20'],
  city: ['ORT01'],
  country: ['LAND1'],
  postalcode: ['PSTLZ'],
  zip: ['PSTLZ'],
  tax: ['MWSKZ', 'STCD1'],
  date: ['DATAB', 'BUDAT'],
  amount: ['DMBTR', 'WRBTR'],
  quantity: ['MENGE'],
  uom: ['MEINS'],
  unit: ['MEINS'],
}

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function tokenize(s: string): string[] {
  return s
    .replace(/([a-z])([A-Z])/g, '$1 $2') // split camelCase
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0)
}

/** Levenshtein distance (iterative, O(n*m)). */
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array(n + 1).fill(0)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

function ratio(a: string, b: string): number {
  if (!a && !b) return 1
  const dist = levenshtein(a, b)
  return 1 - dist / Math.max(a.length, b.length)
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const sa = new Set(a), sb = new Set(b)
  let inter = 0
  for (const t of sa) if (sb.has(t)) inter++
  const union = new Set([...a, ...b]).size
  return union === 0 ? 0 : inter / union
}

export interface FieldSuggestion {
  field: string // SAP technical name
  label: string
  required: boolean
  score: number // 0..1
  reason: string
}

/** Score how well a source header matches a single SAP field. */
export function scoreField(sourceHeader: string, field: MigrationObjectField): { score: number; reason: string } {
  const srcNorm = normalize(sourceHeader)
  const nameNorm = normalize(field.name)
  const labelNorm = normalize(field.label)

  // 1. Exact technical-name match
  if (srcNorm === nameNorm) return { score: 1, reason: `Exact match on SAP field ${field.name}` }
  // 2. Exact label match
  if (srcNorm === labelNorm) return { score: 0.97, reason: `Matches field label "${field.label}"` }

  let best = 0
  let reason = ''

  // 3. Synonym hit
  const syns = SYNONYMS[srcNorm]
  if (syns && syns.includes(field.name)) {
    best = 0.9
    reason = `"${sourceHeader}" is a known synonym for ${field.name}`
  }

  // 4. Token overlap with the label
  const tokenScore = jaccard(tokenize(sourceHeader), tokenize(field.label)) * 0.9
  if (tokenScore > best) { best = tokenScore; reason = `Shares words with "${field.label}"` }

  // 5. Substring containment (either direction)
  if (srcNorm.length >= 3 && (labelNorm.includes(srcNorm) || srcNorm.includes(labelNorm))) {
    const sub = 0.7
    if (sub > best) { best = sub; reason = `Contained in "${field.label}"` }
  }

  // 6. Fuzzy ratio against technical name (catches typos / close codes)
  const fuzzy = ratio(srcNorm, nameNorm) * 0.75
  if (fuzzy > best) { best = fuzzy; reason = `Similar to SAP field ${field.name}` }

  return { score: Math.min(best, 0.95), reason }
}

/** For one source header, return the top SAP field suggestions for an object. */
export function suggestForHeader(
  sourceHeader: string,
  object: MigrationObject,
  limit = 3,
  threshold = 0.4,
): FieldSuggestion[] {
  return object.fields
    .map((f) => {
      const { score, reason } = scoreField(sourceHeader, f)
      return { field: f.name, label: f.label, required: f.required, score: Math.round(score * 100) / 100, reason }
    })
    .filter((s) => s.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export interface HeaderSuggestion {
  sourceHeader: string
  suggestions: FieldSuggestion[]
}

/** Suggest SAP field mappings for a list of source headers. */
export function suggestMappings(headers: string[], object: MigrationObject, limit = 3): HeaderSuggestion[] {
  return headers
    .map((h) => h.trim())
    .filter((h) => h.length > 0)
    .map((sourceHeader) => ({ sourceHeader, suggestions: suggestForHeader(sourceHeader, object, limit) }))
}
