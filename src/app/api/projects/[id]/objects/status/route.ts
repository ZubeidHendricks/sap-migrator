import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { objectId, status } = await req.json()
  const valid = ['PENDING', 'MAPPED', 'READY', 'DONE']
  if (!objectId || !valid.includes(status)) {
    return NextResponse.json({ error: 'objectId and valid status required' }, { status: 400 })
  }

  const obj = await prisma.projectObject.update({
    where: { id: objectId },
    data: { status },
  })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'object.status_changed',
    entityType: 'object',
    entityId: obj.id,
    entityName: obj.objectName,
    metadata: { status, projectId: params.id },
  })

  return NextResponse.json(obj)
}
