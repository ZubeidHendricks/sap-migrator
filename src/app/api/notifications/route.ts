import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.notification.count({ where: { userId: session.user.id, read: false } }),
  ])

  return NextResponse.json({ items, unread })
}

// Mark notifications read: { id } for one, or { all: true } for all.
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, all } = await req.json()
  if (all) {
    await prisma.notification.updateMany({ where: { userId: session.user.id, read: false }, data: { read: true } })
  } else if (id) {
    await prisma.notification.updateMany({ where: { id, userId: session.user.id }, data: { read: true } })
  } else {
    return NextResponse.json({ error: 'id or all required' }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
