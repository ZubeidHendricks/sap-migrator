import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true, brandColor: true, logoUrl: true },
  })
  return NextResponse.json(org ?? {})
}

const HEX = /^#?[0-9a-fA-F]{6}$/

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const { name, brandColor, logoUrl } = await req.json()

  const data: { name?: string; brandColor?: string | null; logoUrl?: string | null } = {}
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    data.name = name.trim()
  }
  if (brandColor !== undefined) {
    if (brandColor && !HEX.test(String(brandColor))) return NextResponse.json({ error: 'Brand color must be a 6-digit hex value' }, { status: 400 })
    data.brandColor = brandColor ? (String(brandColor).startsWith('#') ? String(brandColor) : `#${brandColor}`) : null
  }
  if (logoUrl !== undefined) {
    if (logoUrl && !/^https?:\/\//.test(String(logoUrl))) return NextResponse.json({ error: 'Logo URL must start with http(s)://' }, { status: 400 })
    data.logoUrl = logoUrl ? String(logoUrl) : null
  }

  const org = await prisma.organization.update({
    where: { id: session.user.organizationId },
    data,
    select: { name: true, brandColor: true, logoUrl: true },
  })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'branding.updated',
    entityType: 'organization',
    entityId: session.user.organizationId,
    entityName: org.name,
  })

  return NextResponse.json(org)
}
