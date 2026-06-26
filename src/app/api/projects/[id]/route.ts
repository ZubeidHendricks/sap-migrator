import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

async function getProject(id: string, orgId: string) {
  return prisma.project.findFirst({ where: { id, organizationId: orgId } })
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    include: {
      objects: {
        include: { _count: { select: { mappings: true, templates: true, runRecords: true } } },
        orderBy: { createdAt: 'asc' },
      },
      runs: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await getProject(params.id, session.user.organizationId)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.sourceSystem !== undefined && { sourceSystem: body.sourceSystem }),
      ...(body.targetSystem !== undefined && { targetSystem: body.targetSystem }),
      ...(body.goLiveDate !== undefined && { goLiveDate: body.goLiveDate ? new Date(body.goLiveDate) : null }),
    },
  })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'project.updated',
    entityType: 'project',
    entityId: project.id,
    entityName: updated.name,
    metadata: body,
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await getProject(params.id, session.user.organizationId)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'project.deleted',
    entityType: 'project',
    entityId: project.id,
    entityName: project.name,
  })

  await prisma.project.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
