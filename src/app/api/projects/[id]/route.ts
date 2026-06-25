import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

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
        include: {
          _count: { select: { mappings: true, templates: true, runRecords: true } },
        },
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
      name: body.name ?? project.name,
      description: body.description ?? project.description,
      status: body.status ?? project.status,
      sourceSystem: body.sourceSystem ?? project.sourceSystem,
      targetSystem: body.targetSystem ?? project.targetSystem,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await getProject(params.id, session.user.organizationId)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.project.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
