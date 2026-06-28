// Claude-powered auto-fix for failed validation cells. Builds on the deterministic
// fixer (auto-fix.ts) for the unambiguous cases and uses Claude for the rest.
// Prompt-building and parsing are pure and unit-tested.

import Anthropic from '@anthropic-ai/sdk'
import type { MigrationObject, MigrationObjectField } from './migration-objects'
import { autoFixBatch, type FixInput, type FixResult } from './auto-fix'

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'

export function isLlmEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

interface PromptIssue { row: number; field: string; value: string; message?: string }

export function buildFixPrompt(object: MigrationObject, fields: MigrationObjectField[], issues: PromptIssue[]): string {
  const fieldLines = fields
    .map((f) => `- ${f.name} (${f.label}; ${f.type}${f.required ? ', required' : ''}${f.maxLength ? `, max ${f.maxLength}` : ''})`)
    .join('\n')
  const issueLines = issues
    .map((i) => `- row ${i.row}, field ${i.field}, value "${i.value}"${i.message ? ` — ${i.message}` : ''}`)
    .join('\n')
  return `You are an SAP S/4HANA data-migration expert. Each row below has a value that failed validation for the object "${object.name}". Propose a corrected value that satisfies the field's SAP rules. Use SAP conventions (dates YYYY-MM-DD or YYYYMMDD, numbers without separators, "X"/"" booleans, ISO codes). Respect max length. If a value cannot be corrected (e.g. required data is simply missing), omit it.

Fields:
${fieldLines}

Failed cells:
${issueLines}

Respond with ONLY a JSON object (no prose, no fences):
{"fixes":[{"row":<n>,"field":"<name>","suggested":"<corrected value>","explanation":"<short why>"}]}`
}

export function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : raw
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end < 0 || end < start) throw new Error('no JSON object found')
  return JSON.parse(candidate.slice(start, end + 1))
}

export function parseFixResponse(
  raw: string,
  fieldsByName: Record<string, MigrationObjectField>,
  inputs: FixInput[],
): FixResult[] {
  const parsed = extractJson(raw) as { fixes?: unknown }
  const list = Array.isArray(parsed?.fixes) ? parsed.fixes : []
  const inputByKey = new Map(inputs.map((i) => [`${i.row}:${i.field}`, i]))
  const out: FixResult[] = []
  for (const item of list) {
    const it = item as Record<string, unknown>
    const row = typeof it.row === 'number' ? it.row : Number(it.row)
    const field = typeof it.field === 'string' ? it.field : null
    let suggested = typeof it.suggested === 'string' ? it.suggested : null
    if (!Number.isFinite(row) || field === null || suggested === null) continue
    const def = fieldsByName[field]
    if (!def) continue
    if (def.maxLength && suggested.length > def.maxLength) suggested = suggested.slice(0, def.maxLength)
    const orig = inputByKey.get(`${row}:${field}`)
    out.push({
      row, field, value: orig?.value ?? '',
      suggested,
      explanation: typeof it.explanation === 'string' && it.explanation.trim() ? it.explanation.trim() : 'Suggested by AI',
    })
  }
  return out
}

export async function autoFixLlm(
  object: MigrationObject,
  fieldsByName: Record<string, MigrationObjectField>,
  inputs: (FixInput & { message?: string })[],
): Promise<FixResult[] | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  if (inputs.length === 0) return []
  try {
    const usedFields = [...new Set(inputs.map((i) => i.field))].map((n) => fieldsByName[n]).filter(Boolean) as MigrationObjectField[]
    const client = new Anthropic({ apiKey: key })
    const msg = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: buildFixPrompt(object, usedFields, inputs) }],
    })
    const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n')
    return parseFixResponse(text, fieldsByName, inputs)
  } catch {
    return null
  }
}

export { autoFixBatch }
