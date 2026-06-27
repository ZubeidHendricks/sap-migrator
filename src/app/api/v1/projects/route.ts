import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey } from '@/lib/api-key'

// Public API v1 — authenticated with an API key (Authorization: Bearer smk_live_...).

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })

  const projects = await prisma.project.findMany({
    where: { organizationId: auth.organizationId },
    select: {
      id: true, name: true, description: true, approach: true, status: true,
      sourceSystem: true, targetSystem: true, goLiveDate: true, createdAt: true,
      _count: { select: { objects: true, runs: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ data: projects })
}

export async function POST(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const approach = body.approach
  if (!name || (approach !== 'STAGING_TABLES' && approach !== 'DIRECT_TRANSFER')) {
    return NextResponse.json({ error: 'name and a valid approach (STAGING_TABLES | DIRECT_TRANSFER) are required' }, { status: 400 })
  }

  const project = await prisma.project.create({
    data: {
      name,
      approach,
      description: typeof body.description === 'string' ? body.description : null,
      sourceSystem: typeof body.sourceSystem === 'string' ? body.sourceSystem : null,
      targetSystem: typeof body.targetSystem === 'string' ? body.targetSystem : null,
      organizationId: auth.organizationId,
    },
    select: { id: true, name: true, approach: true, status: true, createdAt: true },
  })

  return NextResponse.json({ data: project }, { status: 201 })
}
