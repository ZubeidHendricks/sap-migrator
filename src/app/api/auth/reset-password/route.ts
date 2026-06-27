import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/validation'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const { token, password } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token and password required' }, { status: 400 })
  const pwError = validatePassword(password)
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 })

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })
  if (!resetToken || resetToken.used || resetToken.expires < new Date()) {
    return NextResponse.json({ error: 'Reset link is invalid or has expired' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 12)
  await Promise.all([
    prisma.user.update({
      where: { email: resetToken.email },
      data: { password: hashed, mustChangePassword: false },
    }),
    prisma.passwordResetToken.update({ where: { token }, data: { used: true } }),
  ])

  return NextResponse.json({ ok: true })
}
