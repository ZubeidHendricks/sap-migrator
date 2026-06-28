import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { scoreProject, type ObjectQualityInput } from '@/lib/quality-score'
import { generateProjectReportPdf } from '@/lib/pdf-report'
import { formatDate } from '@/lib/utils'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    include: {
      organization: { select: { name: true } },
      objects: {
        include: { templates: { orderBy: { createdAt: 'desc' }, take: 1 }, _count: { select: { mappings: true } } },
        orderBy: { createdAt: 'asc' },
      },
      runs: { orderBy: { createdAt: 'desc' }, take: 15 },
    },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const quality = scoreProject({
    objects: project.objects.map((o): ObjectQualityInput => {
      const tmpl = o.templates[0]
      const v = (tmpl?.validationErrors ?? null) as ObjectQualityInput['validation']
      return { status: o.status, hasTemplate: !!tmpl, mappingCount: o._count.mappings, validation: v && typeof v === 'object' && 'totalRows' in v ? v : null }
    }),
  })

  const done = project.objects.filter((o) => o.status === 'DONE').length
  const mapped = project.objects.filter((o) => ['MAPPED', 'READY', 'DONE'].includes(o.status)).length
  const readinessPct = project.objects.length ? Math.round((done / project.objects.length) * 100) : 0

  const bytes = await generateProjectReportPdf({
    projectName: project.name,
    status: project.status,
    approach: project.approach === 'STAGING_TABLES' ? 'Staging Tables' : 'Direct Transfer',
    generatedAt: formatDate(new Date()),
    sourceSystem: project.sourceSystem,
    targetSystem: project.targetSystem,
    goLiveDate: project.goLiveDate ? formatDate(project.goLiveDate) : null,
    quality: { score: quality.score, grade: quality.grade },
    stats: { objects: project.objects.length, mapped, done, runs: project.runs.length, readinessPct },
    objects: project.objects.map((o) => ({ objectKey: o.objectKey, objectName: o.objectName, category: o.category, status: o.status })),
    runs: project.runs.map((r) => ({ type: r.type, status: r.status, totalRecords: r.totalRecords, successCount: r.successCount, errorCount: r.errorCount, createdAt: formatDate(r.createdAt) })),
    orgName: project.organization.name,
  })

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="sap-migration-${project.name.replace(/\s+/g, '-').toLowerCase()}.pdf"`,
    },
  })
}
