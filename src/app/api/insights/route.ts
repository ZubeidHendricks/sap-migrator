import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { scoreProject, type ObjectQualityInput } from '@/lib/quality-score'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await prisma.project.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      objects: {
        include: {
          templates: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { mappings: true } },
        },
      },
      runs: {
        where: { status: 'COMPLETED' },
        select: { type: true, totalRecords: true, successCount: true, errorCount: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const projectStats = projects.map((p) => {
    const quality = scoreProject({
      objects: p.objects.map((o): ObjectQualityInput => {
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
    const done = p.objects.filter((o) => o.status === 'DONE').length
    const readiness = p.objects.length ? Math.round((done / p.objects.length) * 100) : 0
    const recordsMigrated = p.runs
      .filter((r) => r.type === 'MIGRATION')
      .reduce((s, r) => s + r.successCount, 0)
    const totalRun = p.runs.reduce((s, r) => s + r.totalRecords, 0)
    const totalErr = p.runs.reduce((s, r) => s + r.errorCount, 0)
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      objectCount: p.objects.length,
      readiness,
      qualityScore: quality.score,
      qualityGrade: quality.grade,
      runCount: p.runs.length,
      recordsMigrated,
      errorRate: totalRun ? Math.round((totalErr / totalRun) * 1000) / 10 : 0,
    }
  })

  const totals = {
    projects: projects.length,
    objects: projectStats.reduce((s, p) => s + p.objectCount, 0),
    recordsMigrated: projectStats.reduce((s, p) => s + p.recordsMigrated, 0),
    avgQuality: projectStats.length
      ? Math.round(projectStats.reduce((s, p) => s + p.qualityScore, 0) / projectStats.length)
      : 0,
    avgReadiness: projectStats.length
      ? Math.round(projectStats.reduce((s, p) => s + p.readiness, 0) / projectStats.length)
      : 0,
  }

  return NextResponse.json({ totals, projects: projectStats })
}
