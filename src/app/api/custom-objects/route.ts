import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { validateCustomObject, normalizeCustomObject } from '@/lib/object-catalog'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const objects = await prisma.customObject.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(objects)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'VIEWER') return NextResponse.json({ error: 'Viewers cannot create objects' }, { status: 403 })

  const body = await req.json()
  const err = validateCustomObject(body)
  if (err) return NextResponse.json({ error: err }, { status: 400 })

  const data = normalizeCustomObject(body)

  const existing = await prisma.customObject.findFirst({
    where: { organizationId: session.user.organizationId, key: data.key },
  })
  if (existing) return NextResponse.json({ error: `An object with key "${data.key}" already exists` }, { status: 409 })

  const created = await prisma.customObject.create({
    data: {
      organizationId: session.user.organizationId,
      createdById: session.user.id,
      key: data.key,
      name: data.name,
      category: data.category,
      description: data.description,
      sapTable: data.sapTable,
      approach: data.approach as unknown as Prisma.InputJsonValue,
      fields: data.fields as unknown as Prisma.InputJsonValue,
    },
  })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'custom_object.created',
    entityType: 'custom_object',
    entityId: created.id,
    entityName: created.name,
    metadata: { key: created.key, fieldCount: data.fields.length },
  })

  return NextResponse.json(created, { status: 201 })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'VIEWER') return NextResponse.json({ error: 'Viewers cannot delete objects' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const obj = await prisma.customObject.findFirst({
    where: { id, organizationId: session.user.organizationId },
  })
  if (!obj) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'custom_object.deleted',
    entityType: 'custom_object',
    entityId: obj.id,
    entityName: obj.name,
    metadata: { key: obj.key },
  })

  await prisma.customObject.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
