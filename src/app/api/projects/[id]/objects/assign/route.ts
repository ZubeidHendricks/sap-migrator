import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { notify } from '@/lib/notifications'

// Assign (or unassign) a migration object to a team member.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'VIEWER') return NextResponse.json({ error: 'Viewers cannot assign objects' }, { status: 403 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { objectId, assignedToId } = await req.json()
  if (!objectId) return NextResponse.json({ error: 'objectId required' }, { status: 400 })

  const obj = await prisma.projectObject.findFirst({ where: { id: objectId, projectId: params.id } })
  if (!obj) return NextResponse.json({ error: 'Object not found' }, { status: 404 })

  // Validate the assignee is in the same org (or null to unassign).
  let assignee = null
  if (assignedToId) {
    assignee = await prisma.user.findFirst({
      where: { id: assignedToId, organizationId: session.user.organizationId },
      select: { id: true, name: true, email: true },
    })
    if (!assignee) return NextResponse.json({ error: 'Assignee not found' }, { status: 404 })
  }

  const updated = await prisma.projectObject.update({
    where: { id: objectId },
    data: { assignedToId: assignedToId || null },
    select: { id: true, assignedToId: true, assignedTo: { select: { id: true, name: true, email: true } } },
  })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'object.assigned',
    entityType: 'object',
    entityId: obj.id,
    entityName: obj.objectName,
    metadata: { assignedTo: assignee?.email ?? null },
  })

  // Notify the assignee (unless they assigned themselves).
  if (assignee && assignee.id !== session.user.id) {
    await notify([{
      userId: assignee.id,
      type: 'object.assigned',
      title: `You were assigned ${obj.objectName}`,
      body: `${session.user.name ?? session.user.email} assigned you this object in ${project.name}`,
      link: `/projects/${params.id}/templates`,
    }])
  }

  return NextResponse.json(updated)
}
