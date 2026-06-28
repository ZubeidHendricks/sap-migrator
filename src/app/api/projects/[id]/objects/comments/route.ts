import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { notify, commentRecipients, commentPreview } from '@/lib/notifications'

async function ownObject(objectId: string, projectId: string, orgId: string) {
  return prisma.projectObject.findFirst({
    where: { id: objectId, projectId, project: { organizationId: orgId } },
  })
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const objectId = new URL(req.url).searchParams.get('objectId')
  if (!objectId) return NextResponse.json({ error: 'objectId required' }, { status: 400 })
  if (!(await ownObject(objectId, params.id, session.user.organizationId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const comments = await prisma.comment.findMany({
    where: { projectObjectId: objectId },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(comments)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'VIEWER') return NextResponse.json({ error: 'Viewers cannot comment' }, { status: 403 })

  const { objectId, body } = await req.json()
  if (!objectId || !body?.trim()) return NextResponse.json({ error: 'objectId and body required' }, { status: 400 })

  const obj = await ownObject(objectId, params.id, session.user.organizationId)
  if (!obj) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const comment = await prisma.comment.create({
    data: { projectObjectId: objectId, authorId: session.user.id, body: body.trim() },
    include: { author: { select: { id: true, name: true, email: true } } },
  })

  // Notify the object owner + prior commenters (excluding the author).
  const prior = await prisma.comment.findMany({
    where: { projectObjectId: objectId },
    select: { authorId: true },
    distinct: ['authorId'],
  })
  const recipients = commentRecipients({
    authorId: session.user.id,
    ownerId: obj.assignedToId,
    priorCommenterIds: prior.map((p) => p.authorId),
  })
  await notify(recipients.map((userId) => ({
    userId,
    type: 'object.commented' as const,
    title: `New comment on ${obj.objectName}`,
    body: `${session.user.name ?? session.user.email}: ${commentPreview(body)}`,
    link: `/projects/${params.id}/templates`,
  })))

  return NextResponse.json(comment, { status: 201 })
}
