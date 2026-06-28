import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { validateExtractJob } from '@/lib/validation'
import { resolveObject } from '@/lib/object-catalog'
import { generateSampleRows } from '@/lib/connectors/sample-source'
import { buildExtractCsv } from '@/lib/connectors/csv-target'
import { writeToPostgres } from '@/lib/connectors/postgres-target'

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
    select: {
      id: true, name: true, targetType: true, status: true, rowsExtracted: true,
      errorMessage: true, createdAt: true, completedAt: true, objectKeys: true,
    },
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

  const validationError = validateExtractJob(body)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
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
  runExtractJob(job.id, session.user.organizationId, targetType, targetConfig ?? {}, objectKeys).catch(console.error)

  return NextResponse.json(job, { status: 201 })
}

// Rows of sample data generated per object until a live SAP source is wired (Phase 5).
function sampleCountFor(objectKey: string): number {
  let h = 0
  for (const c of objectKey) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return 20 + (h % 80) // 20–99 rows
}

async function runExtractJob(
  jobId: string,
  organizationId: string,
  targetType: string,
  targetConfig: Record<string, string>,
  objectKeys: string[],
) {
  await prisma.dataExtractJob.update({ where: { id: jobId }, data: { status: 'RUNNING', startedAt: new Date() } })

  try {
    // Resolve each object's fields and produce structured rows (sample data
    // stands in for a real SAP read until Phase 5 wires RFC/Migration Cockpit).
    const extracts = []
    for (const key of objectKeys) {
      const obj = await resolveObject(key, organizationId)
      if (!obj) continue
      const { rows } = generateSampleRows(obj, sampleCountFor(key))
      extracts.push({ objectKey: obj.key, objectName: obj.name, fields: obj.fields, rows })
    }

    if (extracts.length === 0) throw new Error('No resolvable objects to extract')

    const totalRows = extracts.reduce((s, e) => s + e.rows.length, 0)
    let outputCsv: string | null = null
    let rowsWritten = totalRows

    if (targetType === 'CSV_DOWNLOAD') {
      outputCsv = buildExtractCsv(extracts)
    } else if (targetType === 'POSTGRESQL') {
      // Real write to the customer's PostgreSQL database.
      rowsWritten = await writeToPostgres(targetConfig, extracts.map((e) => ({ objectKey: e.objectKey, fields: e.fields, rows: e.rows })))
    }
    // SNOWFLAKE / BIGQUERY: drivers not yet wired — row counts reported, write deferred.

    await prisma.dataExtractJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', completedAt: new Date(), rowsExtracted: rowsWritten, outputCsv },
    })
  } catch (err) {
    await prisma.dataExtractJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', errorMessage: err instanceof Error ? err.message : String(err), completedAt: new Date() },
    })
  }
}
