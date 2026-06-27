import { NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-key'
import { listCatalog } from '@/lib/object-catalog'

// Public API v1 — list the available SAP migration objects (built-in + custom).
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })

  const catalog = await listCatalog(auth.organizationId)
  const data = catalog.map((o) => ({
    key: o.key,
    name: o.name,
    category: o.category,
    sapTable: o.sapTable,
    approach: o.approach,
    custom: (o as { custom?: boolean }).custom ?? false,
    fields: o.fields.map((f) => ({ name: f.name, label: f.label, required: f.required, type: f.type, maxLength: f.maxLength })),
  }))

  return NextResponse.json({ data })
}
