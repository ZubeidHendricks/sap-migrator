import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { generateApiKey } from '@/lib/api-key'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const keys = await prisma.apiKey.findMany({
    where: { organizationId: session.user.organizationId, revokedAt: null },
    select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(keys)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'A key name is required' }, { status: 400 })

  const { key, prefix, hash } = generateApiKey()
  const record = await prisma.apiKey.create({
    data: {
      organizationId: session.user.organizationId,
      name: name.trim(),
      keyPrefix: prefix,
      keyHash: hash,
      createdById: session.user.id,
    },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'apikey.created',
    entityType: 'apikey',
    entityId: record.id,
    entityName: record.name,
  })

  // Full key returned exactly once.
  return NextResponse.json({ ...record, key }, { status: 201 })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const { keyId } = await req.json()
  if (!keyId) return NextResponse.json({ error: 'keyId required' }, { status: 400 })

  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, organizationId: session.user.organizationId },
  })
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.apiKey.update({ where: { id: keyId }, data: { revokedAt: new Date() } })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'apikey.revoked',
    entityType: 'apikey',
    entityId: key.id,
    entityName: key.name,
  })

  return NextResponse.json({ success: true })
}
