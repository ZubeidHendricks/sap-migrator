// LLM-powered field mapping. When ANTHROPIC_API_KEY is set, uses Claude to map
// source column headers to SAP target fields; otherwise the caller falls back to
// the deterministic matcher in field-matcher.ts. The prompt-building and
// response-parsing are split into pure functions so they can be unit-tested
// without calling the API.

import Anthropic from '@anthropic-ai/sdk'
import type { MigrationObject } from './migration-objects'
import type { HeaderSuggestion, FieldSuggestion } from './field-matcher'

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'

export function isLlmEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

/** Build the user prompt describing the object's fields and the source headers. */
export function buildPrompt(headers: string[], object: MigrationObject): string {
  const fieldLines = object.fields
    .map((f) => `- ${f.name} (${f.label}; ${f.type}${f.required ? ', required' : ''}${f.maxLength ? `, max ${f.maxLength}` : ''})`)
    .join('\n')
  const headerLines = headers.map((h) => `- ${h}`).join('\n')

  return `You are an SAP S/4HANA data-migration expert. Map each source column header to the most likely SAP target field for the migration object "${object.name}".

SAP target fields:
${fieldLines}

Source column headers:
${headerLines}

For each source header, return up to 3 candidate SAP fields ranked best-first. Only use SAP technical field names from the list above. If nothing fits, return an empty suggestions array for that header.

Respond with ONLY a JSON object (no prose, no markdown fences) in exactly this shape:
{"suggestions":[{"sourceHeader":"<header>","suggestions":[{"field":"<SAP_TECH_NAME>","score":<0..1>,"reason":"<short why>"}]}]}`
}

/** Extract the first JSON object from a model response (handles stray prose / fences). */
export function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : raw
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end < 0 || end < start) throw new Error('no JSON object found')
  return JSON.parse(candidate.slice(start, end + 1))
}

/** Parse + validate an LLM mapping response against the object's real fields.
 *  Drops any hallucinated field names and clamps scores to 0..1. */
export function parseLlmMappingResponse(raw: string, object: MigrationObject): HeaderSuggestion[] {
  const parsed = extractJson(raw) as { suggestions?: unknown }
  const list = Array.isArray(parsed?.suggestions) ? parsed.suggestions : []
  const fieldMap = new Map(object.fields.map((f) => [f.name, f]))

  const out: HeaderSuggestion[] = []
  for (const item of list) {
    const it = item as { sourceHeader?: unknown; suggestions?: unknown }
    if (typeof it.sourceHeader !== 'string') continue
    const rawSugs = Array.isArray(it.suggestions) ? it.suggestions : []
    const suggestions: FieldSuggestion[] = []
    for (const s of rawSugs) {
      const sg = s as { field?: unknown; score?: unknown; reason?: unknown }
      if (typeof sg.field !== 'string') continue
      const field = fieldMap.get(sg.field)
      if (!field) continue // ignore hallucinated fields
      const scoreNum = typeof sg.score === 'number' ? sg.score : Number(sg.score)
      const score = Number.isFinite(scoreNum) ? Math.max(0, Math.min(1, scoreNum)) : 0.5
      suggestions.push({
        field: field.name,
        label: field.label,
        required: field.required,
        score: Math.round(score * 100) / 100,
        reason: typeof sg.reason === 'string' && sg.reason.trim() ? sg.reason.trim() : 'Suggested by AI',
      })
    }
    suggestions.sort((a, b) => b.score - a.score)
    out.push({ sourceHeader: it.sourceHeader, suggestions: suggestions.slice(0, 3) })
  }
  return out
}

/** Call Claude to suggest mappings. Returns null on any failure so the caller
 *  can fall back to the deterministic matcher. */
export async function suggestMappingsLlm(headers: string[], object: MigrationObject): Promise<HeaderSuggestion[] | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  const cleaned = headers.map((h) => h.trim()).filter(Boolean)
  if (cleaned.length === 0) return []

  try {
    const client = new Anthropic({ apiKey: key })
    const msg = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(cleaned, object) }],
    })
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
    return parseLlmMappingResponse(text, object)
  } catch {
    return null
  }
}
