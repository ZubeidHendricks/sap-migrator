import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { resolveObject } from '@/lib/object-catalog'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const objects = await prisma.projectObject.findMany({
    where: { projectId: params.id },
    include: { _count: { select: { mappings: true, templates: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(objects)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { objectKeys }: { objectKeys: string[] } = await req.json()

  const results = await Promise.all(
    objectKeys.map(async (key) => {
      const def = await resolveObject(key, session.user.organizationId)
      if (!def) return null
      return prisma.projectObject.upsert({
        where: { projectId_objectKey: { projectId: params.id, objectKey: key } },
        create: {
          projectId: params.id,
          objectKey: key,
          objectName: def.name,
          category: def.category,
        },
        update: {},
      })
    })
  )

  return NextResponse.json(results.filter(Boolean), { status: 201 })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { objectKey } = await req.json()

  await prisma.projectObject.deleteMany({
    where: { projectId: params.id, objectKey },
  })

  return NextResponse.json({ success: true })
}
