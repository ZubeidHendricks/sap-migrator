import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { validatePassword } from '@/lib/validation'
import bcrypt from 'bcryptjs'

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword) {
    return NextResponse.json({ error: 'Both fields are required' }, { status: 400 })
  }
  const pwError = validatePassword(newPassword)
  if (pwError) {
    return NextResponse.json({ error: pwError }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user?.password) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed, mustChangePassword: false },
  })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'password.changed',
    entityType: 'user',
    entityId: session.user.id,
    entityName: session.user.name ?? session.user.email ?? '',
  })

  return NextResponse.json({ success: true })
}
