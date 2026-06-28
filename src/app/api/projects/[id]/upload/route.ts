import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolveObject } from '@/lib/object-catalog'
import { parseXmlSpreadsheet, validateRows } from '@/lib/validation-rules'
import { profileRows } from '@/lib/data-profile'
import { analyzeQuality } from '@/lib/anomaly'

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

  // Validate the uploaded data against the object's SAP field rules.
  const text = await file.text()
  const objectDef = await resolveObject(objectKey, session.user.organizationId)
  // Parse once, then validate + profile from the same parsed spreadsheet.
  const parsed = objectDef ? parseXmlSpreadsheet(text) : null
  const validation = objectDef && parsed ? validateRows(objectDef, parsed) : null
  const profile = objectDef && parsed ? profileRows(objectDef, parsed) : null
  const quality = objectDef && parsed ? analyzeQuality(objectDef, parsed) : null
  const dataRows = validation
    ? validation.totalRows
    : Math.max(0, (text.match(/<Row/g)?.length ?? 0) - 2)

  const hasErrors = (validation?.errorRows ?? 0) > 0
  const template = await prisma.migrationTemplate.create({
    data: {
      projectObjectId: projectObject.id,
      filename: file.name,
      fileSize: file.size,
      rowCount: dataRows,
      status: hasErrors ? 'INVALID' : 'UPLOADED',
      validationErrors: validation
        ? ({
            totalRows: validation.totalRows,
            validRows: validation.validRows,
            errorRows: validation.errorRows,
            warningRows: validation.warningRows,
            // Cap stored issues to keep the row small; UI shows the first 100.
            issues: validation.issues.slice(0, 100),
          } as unknown as Prisma.InputJsonValue)
        : undefined,
      profile: profile ? (profile as unknown as Prisma.InputJsonValue) : undefined,
      qualityFlags: quality ? (quality as unknown as Prisma.InputJsonValue) : undefined,
    },
  })

  // Mark READY only when the upload passed validation; otherwise record the
  // count but leave status so the user knows it still needs fixing.
  if (!hasErrors && (projectObject.status === 'PENDING' || projectObject.status === 'MAPPED')) {
    await prisma.projectObject.update({
      where: { id: projectObject.id },
      data: { status: 'READY', recordCount: dataRows },
    })
  } else {
    await prisma.projectObject.update({
      where: { id: projectObject.id },
      data: { recordCount: dataRows },
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
