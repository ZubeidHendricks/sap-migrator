import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { scoreObject, scoreProject, type ObjectQualityInput } from '@/lib/quality-score'
import { estimateTimeline } from '@/lib/timeline'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const teamSize = Math.max(1, parseInt(searchParams.get('teamSize') ?? '0') || 0)

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    include: {
      objects: {
        include: {
          templates: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { mappings: true } },
        },
      },
      runs: {
        where: { status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { totalRecords: true, errorCount: true },
      },
    },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const memberCount = await prisma.user.count({ where: { organizationId: session.user.organizationId } })
  const team = teamSize || memberCount || 1

  const objectInsights = project.objects.map((o) => {
    const tmpl = o.templates[0]
    const v = (tmpl?.validationErrors ?? null) as ObjectQualityInput['validation']
    const input: ObjectQualityInput = {
      status: o.status,
      hasTemplate: !!tmpl,
      mappingCount: o._count.mappings,
      validation: v && typeof v === 'object' && 'totalRows' in v ? v : null,
    }
    return { id: o.id, objectKey: o.objectKey, objectName: o.objectName, category: o.category, status: o.status, quality: scoreObject(input) }
  })

  const project_score = scoreProject({
    objects: project.objects.map((o) => {
      const tmpl = o.templates[0]
      const v = (tmpl?.validationErrors ?? null) as ObjectQualityInput['validation']
      return {
        status: o.status,
        hasTemplate: !!tmpl,
        mappingCount: o._count.mappings,
        validation: v && typeof v === 'object' && 'totalRows' in v ? v : null,
      }
    }),
  })

  const readyObjects = project.objects.filter((o) => o.status === 'READY' || o.status === 'DONE').length
  const avgErrorRate = project.runs.length
    ? project.runs.reduce((s, r) => s + (r.totalRecords > 0 ? r.errorCount / r.totalRecords : 0), 0) / project.runs.length
    : 0

  const timeline = estimateTimeline({
    totalObjects: project.objects.length,
    readyObjects,
    avgErrorRate,
    teamSize: team,
  })

  return NextResponse.json({
    projectId: project.id,
    projectName: project.name,
    goLiveDate: project.goLiveDate,
    quality: project_score,
    objects: objectInsights,
    timeline,
    avgErrorRate: Math.round(avgErrorRate * 1000) / 10, // percent, 1dp
    teamSize: team,
  })
}
