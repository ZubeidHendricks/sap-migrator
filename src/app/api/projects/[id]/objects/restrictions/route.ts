import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { logAudit } from '@/lib/audit'

// Set which fields on an object are Admin-only (field-level access). Admin only.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Only admins can change field restrictions' }, { status: 403 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { objectId, restrictedFields } = await req.json()
  if (!objectId || !Array.isArray(restrictedFields)) {
    return NextResponse.json({ error: 'objectId and restrictedFields[] are required' }, { status: 400 })
  }

  const obj = await prisma.projectObject.findFirst({ where: { id: objectId, projectId: params.id } })
  if (!obj) return NextResponse.json({ error: 'Object not found' }, { status: 404 })

  const fields = (restrictedFields as unknown[]).map(String)
  const updated = await prisma.projectObject.update({
    where: { id: objectId },
    data: { restrictedFields: fields as unknown as Prisma.InputJsonValue },
  })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'object.restrictions_changed',
    entityType: 'object',
    entityId: obj.id,
    entityName: obj.objectName,
    metadata: { restrictedCount: fields.length },
  })

  return NextResponse.json({ id: updated.id, restrictedFields: fields })
}
