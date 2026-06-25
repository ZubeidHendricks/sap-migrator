import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const objectKey = formData.get('objectKey') as string | null

  if (!file || !objectKey) {
    return NextResponse.json({ error: 'file and objectKey required' }, { status: 400 })
  }

  if (!file.name.endsWith('.xml')) {
    return NextResponse.json({ error: 'Only .xml files are accepted' }, { status: 400 })
  }

  const projectObject = await prisma.projectObject.findFirst({
    where: { projectId: params.id, objectKey },
  })
  if (!projectObject) return NextResponse.json({ error: 'Object not found in project' }, { status: 404 })

  // Parse row count from XML (count <Row> elements after header rows)
  const text = await file.text()
  const rowMatches = text.match(/<Row/g)
  const totalRows = rowMatches ? rowMatches.length : 0
  // First 2 rows are headers, rest is data
  const dataRows = Math.max(0, totalRows - 2)

  const template = await prisma.migrationTemplate.create({
    data: {
      projectObjectId: projectObject.id,
      filename: file.name,
      fileSize: file.size,
      rowCount: dataRows,
      status: 'UPLOADED',
    },
  })

  // Update object status to READY if it was PENDING
  if (projectObject.status === 'PENDING' || projectObject.status === 'MAPPED') {
    await prisma.projectObject.update({
      where: { id: projectObject.id },
      data: { status: 'READY', recordCount: dataRows },
    })
  }

  // Auto-update project to IN_PROGRESS
  if (project.status === 'DRAFT') {
    await prisma.project.update({
      where: { id: params.id },
      data: { status: 'IN_PROGRESS' },
    })
  }

  return NextResponse.json(template, { status: 201 })
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const objectKey = searchParams.get('objectKey')

  const where = objectKey
    ? { projectObject: { projectId: params.id, objectKey } }
    : { projectObject: { projectId: params.id } }

  const templates = await prisma.migrationTemplate.findMany({
    where,
    include: { projectObject: { select: { objectKey: true, objectName: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(templates)
}
