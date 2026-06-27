import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ projects: [], objects: [] })

  const [projects, objects] = await Promise.all([
    prisma.project.findMany({
      where: {
        organizationId: session.user.organizationId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { sourceSystem: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, status: true, approach: true },
      take: 5,
    }),
    prisma.projectObject.findMany({
      where: {
        project: { organizationId: session.user.organizationId },
        OR: [
          { objectName: { contains: q, mode: 'insensitive' } },
          { objectKey: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, objectKey: true, objectName: true, category: true, status: true, projectId: true, project: { select: { name: true } } },
      take: 8,
    }),
  ])

  return NextResponse.json({ projects, objects })
}
