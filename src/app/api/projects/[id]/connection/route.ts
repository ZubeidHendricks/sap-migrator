import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

async function authorize(projectId: string, orgId: string) {
  return prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } })
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await authorize(params.id, session.user.organizationId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const conn = await prisma.sapConnection.findUnique({ where: { projectId: params.id } })
  if (!conn) return NextResponse.json(null)

  return NextResponse.json({ ...conn, password: '••••••••' })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await authorize(params.id, session.user.organizationId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { host, instanceNumber, client, username, password, systemId } = await req.json()
  if (!host || !instanceNumber || !client || !username || !password) {
    return NextResponse.json({ error: 'All fields except System ID are required' }, { status: 400 })
  }

  const conn = await prisma.sapConnection.upsert({
    where: { projectId: params.id },
    update: { host, instanceNumber, client, username, password, systemId: systemId || null, isVerified: false },
    create: { projectId: params.id, host, instanceNumber, client, username, password, systemId: systemId || null },
  })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'connection.saved',
    entityType: 'project',
    entityId: params.id,
    entityName: host,
    metadata: { host, client, instanceNumber },
  })

  return NextResponse.json({ ...conn, password: '••••••••' })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await authorize(params.id, session.user.organizationId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.sapConnection.deleteMany({ where: { projectId: params.id } })
  return NextResponse.json({ success: true })
}
