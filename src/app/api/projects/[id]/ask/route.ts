import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { buildSnapshot, askLlm, summarize, isLlmEnabled, type SnapshotObjectInput } from '@/lib/nl-query'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question } = await req.json()
  if (!question?.trim()) return NextResponse.json({ error: 'A question is required' }, { status: 400 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    include: {
      objects: {
        include: {
          templates: { orderBy: { createdAt: 'desc' }, take: 1, select: { rowCount: true, validationErrors: true, profile: true, qualityFlags: true } },
          _count: { select: { mappings: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      runs: { orderBy: { createdAt: 'desc' }, take: 20, select: { type: true, status: true, totalRecords: true, successCount: true, errorCount: true, createdAt: true } },
    },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const objects: SnapshotObjectInput[] = project.objects.map((o) => ({
    objectKey: o.objectKey, objectName: o.objectName, category: o.category, status: o.status,
    assignedToId: o.assignedToId, mappingCount: o._count.mappings,
    template: o.templates[0] ?? null,
  }))

  const snapshot = buildSnapshot({
    name: project.name, status: project.status, approach: project.approach, goLiveDate: project.goLiveDate,
    objects, runs: project.runs,
  })

  let engine: 'ai' | 'rules' = 'rules'
  let answer: string | null = null
  if (isLlmEnabled()) {
    answer = await askLlm(question.trim(), snapshot)
    if (answer) engine = 'ai'
  }
  if (!answer) answer = summarize(snapshot)

  return NextResponse.json({ engine, answer })
}
