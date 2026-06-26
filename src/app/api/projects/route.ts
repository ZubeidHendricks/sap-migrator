import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await prisma.project.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      _count: { select: { objects: true, runs: true } },
      objects: { select: { status: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(projects)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, approach, sourceSystem, targetSystem, goLiveDate } = body

  if (!name || !approach) {
    return NextResponse.json({ error: 'Name and approach are required' }, { status: 400 })
  }

  const project = await prisma.project.create({
    data: {
      name,
      description,
      approach,
      sourceSystem,
      targetSystem,
      goLiveDate: goLiveDate ? new Date(goLiveDate) : undefined,
      organizationId: session.user.organizationId,
    },
  })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'project.created',
    entityType: 'project',
    entityId: project.id,
    entityName: project.name,
  })

  return NextResponse.json(project, { status: 201 })
}
