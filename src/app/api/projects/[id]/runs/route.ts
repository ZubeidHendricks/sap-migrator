import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const runs = await prisma.migrationRun.findMany({
    where: { projectId: params.id },
    include: {
      records: {
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { projectObject: { select: { objectName: true, objectKey: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(runs)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    include: { objects: true },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { type } = await req.json()
  if (!['SIMULATION', 'MIGRATION'].includes(type)) {
    return NextResponse.json({ error: 'type must be SIMULATION or MIGRATION' }, { status: 400 })
  }

  const run = await prisma.migrationRun.create({
    data: {
      projectId: params.id,
      type,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  })

  // Simulate async processing — in production this would be a background job
  simulateRun(run.id, project.objects.map((o) => o.id)).catch(console.error)

  return NextResponse.json(run, { status: 201 })
}

async function simulateRun(runId: string, objectIds: string[]) {
  await new Promise((r) => setTimeout(r, 800))

  let totalRecords = 0
  let successCount = 0
  let errorCount = 0
  const records: { runId: string; projectObjectId: string; recordKey: string; status: 'SUCCESS' | 'ERROR' | 'WARNING'; message?: string }[] = []

  for (const objectId of objectIds) {
    const count = Math.floor(Math.random() * 50) + 10
    totalRecords += count
    for (let i = 1; i <= count; i++) {
      const rand = Math.random()
      let status: 'SUCCESS' | 'ERROR' | 'WARNING' = 'SUCCESS'
      let message: string | undefined
      if (rand < 0.08) {
        status = 'ERROR'
        errorCount++
        message = pickError()
      } else if (rand < 0.15) {
        status = 'WARNING'
        message = 'Field truncated to allowed length'
      } else {
        successCount++
      }
      records.push({ runId, projectObjectId: objectId, recordKey: `REC-${objectId.slice(-4)}-${i}`, status, message })
    }
  }

  await prisma.runRecord.createMany({ data: records })
  await prisma.migrationRun.update({
    where: { id: runId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      totalRecords,
      successCount,
      errorCount,
      warningCount: totalRecords - successCount - errorCount,
    },
  })
}

function pickError() {
  const errors = [
    'Required field BUKRS is missing',
    'Value "EUR" not found in value mapping for WAERS',
    'Date format invalid: expected YYYY-MM-DD',
    'Account group GRAL does not exist in target system',
    'Duplicate key: record already exists',
    'Field KUNNR exceeds maximum length of 10',
  ]
  return errors[Math.floor(Math.random() * errors.length)]
}
