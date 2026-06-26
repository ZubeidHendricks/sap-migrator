import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { name, email, password, organizationName } = await req.json()

    if (!name || !email || !password || !organizationName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const baseSlug = slugify(organizationName)

    const existingOrg = await prisma.organization.findUnique({ where: { slug: baseSlug } })
    const slug = existingOrg ? `${baseSlug}-${Date.now()}` : baseSlug

    const org = await prisma.organization.create({
      data: { name: organizationName, slug },
    })

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: 'ADMIN',
        organizationId: org.id,
      },
    })

    const appUrl = process.env.NEXTAUTH_URL || 'https://sap-migrator-5vybv.ondigitalocean.app'
    await sendWelcomeEmail({
      to: email,
      name,
      orgName: organizationName,
      loginUrl: `${appUrl}/dashboard`,
    }).catch(() => {})

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
