// Natural-language query over a project's migration data. Builds a compact,
// structured snapshot of the project and asks Claude to answer the user's
// question grounded ONLY in that snapshot. Snapshot + prompt builders are pure
// and unit-tested; the Claude call falls back to a deterministic summary.

import Anthropic from '@anthropic-ai/sdk'

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'

export function isLlmEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

export interface SnapshotObjectInput {
  objectKey: string
  objectName: string
  category: string
  status: string
  assignedToId: string | null
  mappingCount: number
  template: {
    rowCount: number | null
    validationErrors: unknown
    profile: unknown
    qualityFlags: unknown
  } | null
}

export interface SnapshotInput {
  name: string
  status: string
  approach: string
  goLiveDate: Date | null
  objects: SnapshotObjectInput[]
  runs: { type: string; status: string; totalRecords: number; successCount: number; errorCount: number; createdAt: Date }[]
}

export interface ProjectSnapshot {
  project: { name: string; status: string; approach: string; goLiveDate: string | null }
  totals: { objects: number; ready: number; done: number; assigned: number; recordsMigrated: number }
  objects: {
    key: string; name: string; category: string; status: string; assigned: boolean; mappings: number
    hasTemplate: boolean; rows: number; errorRows: number; warningRows: number
    duplicateRows: number; anomalies: number; fillRateAvg: number | null
  }[]
  runs: { total: number; byStatus: Record<string, number>; last: { type: string; status: string; success: number; errors: number; total: number } | null }
}

function num(v: unknown): number { return typeof v === 'number' ? v : 0 }

export function buildSnapshot(input: SnapshotInput): ProjectSnapshot {
  const objects = input.objects.map((o) => {
    const ve = (o.template?.validationErrors ?? null) as { errorRows?: number; warningRows?: number } | null
    const qf = (o.template?.qualityFlags ?? null) as { duplicateRowCount?: number; anomalies?: unknown[] } | null
    const prof = (o.template?.profile ?? null) as { fields?: { fillRate: number }[] } | null
    let fillRateAvg: number | null = null
    if (prof?.fields && prof.fields.length) {
      fillRateAvg = Math.round((prof.fields.reduce((s, f) => s + (f.fillRate ?? 0), 0) / prof.fields.length) * 100) / 100
    }
    return {
      key: o.objectKey, name: o.objectName, category: o.category, status: o.status,
      assigned: !!o.assignedToId, mappings: o.mappingCount,
      hasTemplate: !!o.template, rows: o.template?.rowCount ?? 0,
      errorRows: num(ve?.errorRows), warningRows: num(ve?.warningRows),
      duplicateRows: num(qf?.duplicateRowCount), anomalies: Array.isArray(qf?.anomalies) ? qf!.anomalies!.length : 0,
      fillRateAvg,
    }
  })

  const byStatus: Record<string, number> = {}
  for (const r of input.runs) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
  const last = input.runs[0]
    ? { type: input.runs[0].type, status: input.runs[0].status, success: input.runs[0].successCount, errors: input.runs[0].errorCount, total: input.runs[0].totalRecords }
    : null
  const recordsMigrated = input.runs.filter((r) => r.type === 'MIGRATION' && r.status === 'COMPLETED').reduce((s, r) => s + r.successCount, 0)

  return {
    project: { name: input.name, status: input.status, approach: input.approach, goLiveDate: input.goLiveDate ? input.goLiveDate.toISOString().slice(0, 10) : null },
    totals: {
      objects: objects.length,
      ready: objects.filter((o) => o.status === 'READY' || o.status === 'DONE').length,
      done: objects.filter((o) => o.status === 'DONE').length,
      assigned: objects.filter((o) => o.assigned).length,
      recordsMigrated,
    },
    objects,
    runs: { total: input.runs.length, byStatus, last },
  }
}

export function buildQueryPrompt(question: string, snapshot: ProjectSnapshot): string {
  return `You are a data assistant for an SAP S/4HANA migration project. Answer the user's question using ONLY the JSON snapshot below. Be concise and specific — cite object names/keys and numbers. If the snapshot doesn't contain enough information to answer, say so plainly. Do not invent data.

Snapshot:
${JSON.stringify(snapshot)}

Question: ${question}

Answer:`
}

/** Deterministic fallback answer when no LLM is configured. */
export function summarize(snapshot: ProjectSnapshot): string {
  const t = snapshot.totals
  const withErrors = snapshot.objects.filter((o) => o.errorRows > 0).map((o) => o.name)
  const unassigned = snapshot.objects.filter((o) => !o.assigned).length
  const lines = [
    `${snapshot.project.name}: ${t.objects} objects, ${t.ready} ready, ${t.done} done, ${t.assigned} assigned.`,
    `${t.recordsMigrated.toLocaleString()} records migrated across ${snapshot.runs.total} runs.`,
    withErrors.length ? `Objects with validation errors: ${withErrors.join(', ')}.` : 'No objects have validation errors.',
    unassigned ? `${unassigned} object(s) have no owner.` : 'All objects are assigned.',
  ]
  return lines.join(' ')
}

export async function askLlm(question: string, snapshot: ProjectSnapshot): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  try {
    const client = new Anthropic({ apiKey: key })
    const msg = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 600,
      messages: [{ role: 'user', content: buildQueryPrompt(question, snapshot) }],
    })
    const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n').trim()
    return text || null
  } catch {
    return null
  }
}
