import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

// Return the data profile from the most recent upload of an object.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const objectKey = new URL(req.url).searchParams.get('objectKey')
  if (!objectKey) return NextResponse.json({ error: 'objectKey required' }, { status: 400 })

  const obj = await prisma.projectObject.findFirst({
    where: { projectId: params.id, objectKey, project: { organizationId: session.user.organizationId } },
  })
  if (!obj) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const template = await prisma.migrationTemplate.findFirst({
    where: { projectObjectId: obj.id },
    orderBy: { createdAt: 'desc' },
    select: { profile: true, createdAt: true, filename: true },
  })

  if (!template?.profile) return NextResponse.json({ profile: null })
  return NextResponse.json({ profile: template.profile, uploadedAt: template.createdAt, filename: template.filename })
}
