import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const jobs = await prisma.dataExtractJob.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(jobs)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    include: { objects: true, sapConnection: true },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { name, targetType, targetConfig, objectKeys } = body

  if (!name || !targetType || !objectKeys?.length) {
    return NextResponse.json({ error: 'name, targetType and objectKeys are required' }, { status: 400 })
  }

  const job = await prisma.dataExtractJob.create({
    data: {
      projectId: params.id,
      name,
      targetType,
      targetConfig: targetConfig ?? {},
      objectKeys,
      status: 'PENDING',
    },
  })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'extract.created',
    entityType: 'extract',
    entityId: job.id,
    entityName: name,
    metadata: { targetType, objectCount: objectKeys.length },
  })

  // Run async
  runExtractJob(job.id, project.objects, targetType, targetConfig ?? {}, objectKeys).catch(console.error)

  return NextResponse.json(job, { status: 201 })
}

async function runExtractJob(
  jobId: string,
  objects: { id: string; objectKey: string; objectName: string }[],
  targetType: string,
  targetConfig: Record<string, string>,
  objectKeys: string[],
) {
  await prisma.dataExtractJob.update({ where: { id: jobId }, data: { status: 'RUNNING', startedAt: new Date() } })

  await new Promise((r) => setTimeout(r, 1200))

  try {
    const selectedObjects = objects.filter((o) => objectKeys.includes(o.objectKey))
    let totalRows = 0

    for (const obj of selectedObjects) {
      // Simulate extraction: in a real implementation this would call SAP RFC/BAPI
      const rowCount = Math.floor(Math.random() * 500) + 50
      totalRows += rowCount
      await new Promise((r) => setTimeout(r, 200))
    }

    await prisma.dataExtractJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', completedAt: new Date(), rowsExtracted: totalRows },
    })
  } catch (err) {
    await prisma.dataExtractJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', errorMessage: String(err), completedAt: new Date() },
    })
  }
}
