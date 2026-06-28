import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { notify } from '@/lib/notifications'
import { executeRun } from '@/lib/run-executor'

// Approve or reject a migration run that is awaiting approval. Admin only.
export async function POST(req: Request, { params }: { params: { id: string; runId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Only admins can approve runs' }, { status: 403 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    include: { objects: { select: { id: true } } },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const run = await prisma.migrationRun.findFirst({ where: { id: params.runId, projectId: params.id } })
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  if (run.status !== 'AWAITING_APPROVAL') {
    return NextResponse.json({ error: 'This run is not awaiting approval' }, { status: 400 })
  }

  const { decision, note } = await req.json()
  if (decision !== 'approve' && decision !== 'reject') {
    return NextResponse.json({ error: 'decision must be "approve" or "reject"' }, { status: 400 })
  }

  if (decision === 'reject') {
    await prisma.migrationRun.update({
      where: { id: run.id },
      data: { status: 'CANCELLED', approvedById: session.user.id, approvedAt: new Date(), approvalNote: note ?? null, completedAt: new Date() },
    })
    await logAudit({
      organizationId: session.user.organizationId, userId: session.user.id,
      action: 'run.rejected', entityType: 'run', entityId: run.id, entityName: project.name,
      metadata: { note: note ?? null },
    })
    if (run.requestedById && run.requestedById !== session.user.id) {
      await notify([{
        userId: run.requestedById, type: 'mention',
        title: `Migration run rejected — ${project.name}`,
        body: note ? `Reason: ${note}` : `${session.user.name ?? session.user.email} rejected your migration run`,
        link: `/projects/${params.id}/runs`,
      }])
    }
    return NextResponse.json({ status: 'CANCELLED' })
  }

  // Approve → mark approved and execute.
  await prisma.migrationRun.update({
    where: { id: run.id },
    data: { approvedById: session.user.id, approvedAt: new Date(), approvalNote: note ?? null },
  })
  await logAudit({
    organizationId: session.user.organizationId, userId: session.user.id,
    action: 'run.approved', entityType: 'run', entityId: run.id, entityName: project.name,
  })
  if (run.requestedById && run.requestedById !== session.user.id) {
    await notify([{
      userId: run.requestedById, type: 'mention',
      title: `Migration run approved — ${project.name}`,
      body: `${session.user.name ?? session.user.email} approved your migration run; it is now running`,
      link: `/projects/${params.id}/runs`,
    }])
  }

  executeRun({
    runId: run.id,
    objectIds: project.objects.map((o) => o.id),
    projectId: params.id,
    projectName: project.name,
    runType: run.type,
    orgId: session.user.organizationId,
    userId: run.requestedById ?? session.user.id,
  }).catch(console.error)

  return NextResponse.json({ status: 'RUNNING' })
}
