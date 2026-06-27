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
    include: {
      objects: {
        include: {
          templates: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { mappings: true } },
        },
      },
      runs: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rows = [
    ['SAP Migrator — Project Export'],
    [`Project: ${project.name}`],
    [`Status: ${project.status}`],
    [`Approach: ${project.approach}`],
    [`Exported: ${new Date().toISOString()}`],
    [],
    ['MIGRATION OBJECTS'],
    ['Object Key', 'Object Name', 'Category', 'Status', 'Template Uploaded', 'Row Count', 'Value Mappings'],
    ...project.objects.map((o) => [
      o.objectKey,
      o.objectName,
      o.category,
      o.status,
      o.templates[0] ? o.templates[0].filename : 'Not uploaded',
      o.templates[0]?.rowCount ?? '',
      o._count.mappings,
    ]),
    [],
    ['MIGRATION RUNS'],
    ['Type', 'Status', 'Total Records', 'Success', 'Errors', 'Warnings', 'Date'],
    ...project.runs.map((r) => [
      r.type,
      r.status,
      r.totalRecords,
      r.successCount,
      r.errorCount,
      r.warningCount,
      r.createdAt.toISOString(),
    ]),
  ]

  const csv = toCSV(rows)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="sap-migration-${project.name.replace(/\s+/g, '-').toLowerCase()}.csv"`,
    },
  })
}
