import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import crypto from 'crypto'

function getResend() {
  const key = process.env.RESEND_API_KEY
  return key ? new Resend(key) : null
}

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })
  // Always return 200 to avoid email enumeration
  if (!user) return NextResponse.json({ ok: true })

  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordResetToken.create({ data: { email, token, expires } })

  const appUrl = process.env.NEXTAUTH_URL || 'https://sap-migrator-5vybv.ondigitalocean.app'
  const resetUrl = `${appUrl}/reset-password?token=${token}`

  const resend = getResend()
  if (resend) {
    await resend.emails.send({
      from: 'SAP Migrator <noreply@sapmigrator.app>',
      to: email,
      subject: 'Reset your SAP Migrator password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#1e3a5f">Reset your password</h2>
          <p>You requested a password reset for your SAP Migrator account.</p>
          <p style="margin:24px 0">
            <a href="${resetUrl}" style="background:#1e3a5f;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
              Reset Password
            </a>
          </p>
          <p style="color:#666;font-size:14px">This link expires in 1 hour. If you did not request this, ignore this email.</p>
          <p style="color:#999;font-size:12px;margin-top:24px">Or copy this URL: ${resetUrl}</p>
        </div>
      `,
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
