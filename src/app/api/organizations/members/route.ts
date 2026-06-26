import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendInviteEmail } from '@/lib/email'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const members = await prisma.user.findMany({
    where: { organizationId: session.user.organizationId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(members)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const { name, email, role } = await req.json()
  if (!name || !email) return NextResponse.json({ error: 'Name and email required' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

  const tempPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
  const hashed = await bcrypt.hash(tempPassword, 12)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      mustChangePassword: true,
      role: role ?? 'MIGRATOR',
      organizationId: session.user.organizationId,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'member.invited',
    entityType: 'user',
    entityId: user.id,
    entityName: name,
    metadata: { email, role: role ?? 'MIGRATOR' },
  })

  const appUrl = process.env.NEXTAUTH_URL || 'https://sap-migrator-5vybv.ondigitalocean.app'
  await sendInviteEmail({
    to: email,
    name,
    inviterName: session.user.name ?? session.user.email ?? 'Your admin',
    orgName: session.user.organizationName,
    tempPassword,
    loginUrl: `${appUrl}/login`,
  }).catch(() => {})

  return NextResponse.json({ ...user, tempPassword }, { status: 201 })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  if (userId === session.user.id) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })

  const member = await prisma.user.findFirst({
    where: { id: userId, organizationId: session.user.organizationId },
  })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'member.removed',
    entityType: 'user',
    entityId: member.id,
    entityName: member.name ?? member.email,
  })

  await prisma.user.delete({ where: { id: userId } })
  return NextResponse.json({ success: true })
}
