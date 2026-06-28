import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { isValidRunType } from '@/lib/validation'
import { notify } from '@/lib/notifications'
import { executeRun } from '@/lib/run-executor'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const runs = await prisma.migrationRun.findMany({
    where: { projectId: params.id },
    include: {
      records: {
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { projectObject: { select: { objectName: true, objectKey: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(runs)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    include: { objects: true },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (session.user.role === 'VIEWER') {
    return NextResponse.json({ error: 'Viewers cannot launch runs' }, { status: 403 })
  }

  const { type } = await req.json()
  if (!isValidRunType(type)) {
    return NextResponse.json({ error: 'type must be SIMULATION or MIGRATION' }, { status: 400 })
  }

  // Migration runs launched by a non-Admin require Admin approval before they
  // execute. Simulations (non-committing) and Admin-launched migrations run now.
  const needsApproval = type === 'MIGRATION' && session.user.role !== 'ADMIN'

  if (needsApproval) {
    const run = await prisma.migrationRun.create({
      data: {
        projectId: params.id, type, status: 'AWAITING_APPROVAL',
        requestedById: session.user.id,
      },
      include: { records: true },
    })
    await logAudit({
      organizationId: session.user.organizationId, userId: session.user.id,
      action: 'run.submitted', entityType: 'run', entityId: run.id, entityName: project.name,
    })
    // Notify all admins that a run awaits approval.
    const admins = await prisma.user.findMany({
      where: { organizationId: session.user.organizationId, role: 'ADMIN' },
      select: { id: true },
    })
    await notify(admins.map((a) => ({
      userId: a.id,
      type: 'mention' as const,
      title: `Migration run awaiting approval — ${project.name}`,
      body: `${session.user.name ?? session.user.email} requested a migration run`,
      link: `/projects/${params.id}/runs`,
    })))
    return NextResponse.json(run, { status: 201 })
  }

  const run = await prisma.migrationRun.create({
    data: {
      projectId: params.id, type, status: 'RUNNING', startedAt: new Date(),
      requestedById: session.user.id,
      ...(type === 'MIGRATION' ? { approvedById: session.user.id, approvedAt: new Date() } : {}),
    },
    include: { records: true },
  })

  executeRun({
    runId: run.id,
    objectIds: project.objects.map((o) => o.id),
    projectId: params.id,
    projectName: project.name,
    runType: type,
    orgId: session.user.organizationId,
    userId: session.user.id,
  }).catch(console.error)

  return NextResponse.json(run, { status: 201 })
}
