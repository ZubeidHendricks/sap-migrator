import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const objectId = searchParams.get('objectId')

  const mappings = await prisma.valueMapping.findMany({
    where: objectId ? { projectObjectId: objectId } : {
      projectObject: { projectId: params.id },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(mappings)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectObjectId, fieldName, fieldLabel, sourceValue, targetValue } = await req.json()

  const obj = await prisma.projectObject.findFirst({
    where: { id: projectObjectId, projectId: params.id },
  })
  if (!obj) return NextResponse.json({ error: 'Object not found' }, { status: 404 })

  const mapping = await prisma.valueMapping.create({
    data: { projectObjectId, fieldName, fieldLabel, sourceValue, targetValue },
  })

  return NextResponse.json(mapping, { status: 201 })
}

export async function DELETE(req: Request, { params: _params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { mappingId } = await req.json()
  await prisma.valueMapping.delete({ where: { id: mappingId } })
  return NextResponse.json({ success: true })
}
