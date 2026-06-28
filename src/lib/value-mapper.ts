// Deterministic value-mapping suggestions: map common legacy source values to
// SAP target codes for well-known domains (currency, country, boolean-ish, tax).
// Pure and unit-tested; the LLM mapper (llm-value-mapper) falls back to this.

import type { MigrationObjectField } from './migration-objects'

export interface ValueSuggestion {
  sourceValue: string
  targetValue: string
  confidence: number // 0..1
  reason: string
}

const CURRENCY: Record<string, string> = {
  'us dollar': 'USD', 'usd': 'USD', 'dollar': 'USD', 'dollars': 'USD', 'united states dollar': 'USD',
  'euro': 'EUR', 'eur': 'EUR', 'euros': 'EUR',
  'british pound': 'GBP', 'pound': 'GBP', 'pound sterling': 'GBP', 'gbp': 'GBP', 'sterling': 'GBP',
  'south african rand': 'ZAR', 'rand': 'ZAR', 'zar': 'ZAR',
  'japanese yen': 'JPY', 'yen': 'JPY', 'jpy': 'JPY',
  'swiss franc': 'CHF', 'franc': 'CHF', 'chf': 'CHF',
  'australian dollar': 'AUD', 'aud': 'AUD',
  'canadian dollar': 'CAD', 'cad': 'CAD',
  'indian rupee': 'INR', 'rupee': 'INR', 'inr': 'INR',
  'chinese yuan': 'CNY', 'yuan': 'CNY', 'renminbi': 'CNY', 'cny': 'CNY',
}

const COUNTRY: Record<string, string> = {
  'united states': 'US', 'usa': 'US', 'u.s.a.': 'US', 'america': 'US', 'us': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB', 'britain': 'GB', 'england': 'GB',
  'germany': 'DE', 'deutschland': 'DE',
  'france': 'FR', 'south africa': 'ZA', 'india': 'IN', 'china': 'CN', 'japan': 'JP',
  'australia': 'AU', 'canada': 'CA', 'brazil': 'BR', 'spain': 'ES', 'italy': 'IT',
  'netherlands': 'NL', 'switzerland': 'CH',
}

const TRUE_SET = new Set(['x', 'yes', 'y', 'true', '1', 'active', 'enabled'])
const FALSE_SET = new Set(['no', 'n', 'false', '0', 'inactive', 'disabled', ''])

function norm(s: string): string {
  return s.trim().toLowerCase()
}

/** Heuristic: which domain a field likely belongs to, from its name/label. */
function fieldDomain(field: MigrationObjectField): 'currency' | 'country' | 'boolean' | 'unknown' {
  if (field.type === 'boolean') return 'boolean'
  const hay = `${field.name} ${field.label}`.toLowerCase()
  if (/\b(waers|curr|currency)\b/.test(hay) || hay.includes('currency')) return 'currency'
  if (/\b(land1|country|nation)\b/.test(hay) || hay.includes('country')) return 'country'
  return 'unknown'
}

/** Suggest an SAP target value for a single source value. Null if unsure. */
export function suggestValue(field: MigrationObjectField, sourceValue: string): ValueSuggestion | null {
  const raw = sourceValue.trim()
  if (raw === '') return null
  const n = norm(raw)
  const domain = fieldDomain(field)

  if (domain === 'currency' && CURRENCY[n]) {
    return { sourceValue: raw, targetValue: CURRENCY[n], confidence: 0.95, reason: 'Mapped to ISO 4217 currency code' }
  }
  if (domain === 'country' && COUNTRY[n]) {
    return { sourceValue: raw, targetValue: COUNTRY[n], confidence: 0.95, reason: 'Mapped to ISO 3166 country code' }
  }
  if (domain === 'boolean') {
    if (TRUE_SET.has(n)) return { sourceValue: raw, targetValue: 'X', confidence: 0.9, reason: 'SAP boolean flag (set)' }
    if (FALSE_SET.has(n)) return { sourceValue: raw, targetValue: '', confidence: 0.9, reason: 'SAP boolean flag (unset)' }
  }
  // Domain-agnostic: a value that already looks like a short uppercase code
  // probably maps to itself.
  if (/^[A-Z0-9]{1,10}$/.test(raw) && (!field.maxLength || raw.length <= field.maxLength)) {
    return { sourceValue: raw, targetValue: raw, confidence: 0.5, reason: 'Already looks like an SAP code' }
  }
  return null
}

/** Suggest mappings for a list of source values. */
export function suggestValues(field: MigrationObjectField, sourceValues: string[]): ValueSuggestion[] {
  const seen = new Set<string>()
  const out: ValueSuggestion[] = []
  for (const v of sourceValues) {
    const key = v.trim()
    if (key === '' || seen.has(key)) continue
    seen.add(key)
    const s = suggestValue(field, key)
    if (s) out.push(s)
  }
  return out
}
