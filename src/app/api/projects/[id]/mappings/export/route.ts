import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { toCSV } from '@/lib/csv'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const mappings = await prisma.valueMapping.findMany({
    where: { projectObject: { projectId: params.id } },
    include: { projectObject: { select: { objectKey: true, objectName: true } } },
    orderBy: [{ projectObject: { objectKey: 'asc' } }, { fieldName: 'asc' }],
  })

  const rows = [
    ['Object Key', 'Object Name', 'Field Name', 'Field Label', 'Source Value', 'Target Value'],
    ...mappings.map((m) => [
      m.projectObject.objectKey,
      m.projectObject.objectName,
      m.fieldName,
      m.fieldLabel ?? '',
      m.sourceValue,
      m.targetValue,
    ]),
  ]

  const csv = toCSV(rows)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="mappings-${project.name.replace(/\s+/g, '-').toLowerCase()}.csv"`,
    },
  })
}
