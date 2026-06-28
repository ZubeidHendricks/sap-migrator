// Claude-powered value-mapping suggestions. When ANTHROPIC_API_KEY is set, asks
// Claude to map legacy source values to SAP target codes for a field; otherwise
// the caller uses the deterministic mapper. Prompt-building and parsing are pure
// and unit-tested.

import Anthropic from '@anthropic-ai/sdk'
import type { MigrationObject, MigrationObjectField } from './migration-objects'
import type { ValueSuggestion } from './value-mapper'

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'

export function isLlmEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

export function buildValuePrompt(object: MigrationObject, field: MigrationObjectField, values: string[]): string {
  return `You are an SAP S/4HANA data-migration expert. Map each legacy source value to the correct SAP target value for this field.

Object: ${object.name}
Field: ${field.name} (${field.label}; type ${field.type}${field.maxLength ? `, max length ${field.maxLength}` : ''})

Use standard SAP conventions (e.g. ISO 4217 currency codes like USD/EUR, ISO 3166 country codes, "X"/"" for boolean flags). Keep target values within the field's max length. If you cannot confidently map a value, omit it.

Source values:
${values.map((v) => `- ${v}`).join('\n')}

Respond with ONLY a JSON object (no prose, no markdown fences):
{"suggestions":[{"sourceValue":"<value>","targetValue":"<SAP value>","confidence":<0..1>,"reason":"<short why>"}]}`
}

export function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : raw
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end < 0 || end < start) throw new Error('no JSON object found')
  return JSON.parse(candidate.slice(start, end + 1))
}

export function parseValueResponse(raw: string, field: MigrationObjectField): ValueSuggestion[] {
  const parsed = extractJson(raw) as { suggestions?: unknown }
  const list = Array.isArray(parsed?.suggestions) ? parsed.suggestions : []
  const out: ValueSuggestion[] = []
  for (const item of list) {
    const it = item as Record<string, unknown>
    const sourceValue = typeof it.sourceValue === 'string' ? it.sourceValue : null
    let targetValue = typeof it.targetValue === 'string' ? it.targetValue : null
    if (sourceValue === null || targetValue === null) continue
    if (field.maxLength && targetValue.length > field.maxLength) targetValue = targetValue.slice(0, field.maxLength)
    const c = typeof it.confidence === 'number' ? it.confidence : Number(it.confidence)
    const confidence = Number.isFinite(c) ? Math.max(0, Math.min(1, c)) : 0.6
    out.push({
      sourceValue,
      targetValue,
      confidence: Math.round(confidence * 100) / 100,
      reason: typeof it.reason === 'string' && it.reason.trim() ? it.reason.trim() : 'Suggested by AI',
    })
  }
  return out
}

export async function suggestValuesLlm(
  object: MigrationObject,
  field: MigrationObjectField,
  values: string[],
): Promise<ValueSuggestion[] | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  const cleaned = [...new Set(values.map((v) => v.trim()).filter(Boolean))]
  if (cleaned.length === 0) return []
  try {
    const client = new Anthropic({ apiKey: key })
    const msg = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: buildValuePrompt(object, field, cleaned) }],
    })
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
    return parseValueResponse(text, field)
  } catch {
    return null
  }
}
