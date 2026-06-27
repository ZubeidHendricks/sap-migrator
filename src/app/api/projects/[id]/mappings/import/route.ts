import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { parseMappingsCSV } from '@/lib/csv'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    include: { objects: true },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  const text = await file.text()
  const { rows, error } = parseMappingsCSV(text)
  if (error) return NextResponse.json({ error }, { status: 400 })

  // Build index of objectKey → projectObjectId
  const objIndex = Object.fromEntries(project.objects.map((o) => [o.objectKey, o.id]))

  const toCreate: { projectObjectId: string; fieldName: string; fieldLabel?: string; sourceValue: string; targetValue: string }[] = []
  const skipped: string[] = []

  for (const row of rows) {
    const projectObjectId = objIndex[row.objectKey]
    if (!projectObjectId) { skipped.push(row.objectKey); continue }
    toCreate.push({
      projectObjectId,
      fieldName: row.fieldName,
      fieldLabel: row.fieldLabel,
      sourceValue: row.sourceValue,
      targetValue: row.targetValue,
    })
  }

  await prisma.valueMapping.createMany({ data: toCreate, skipDuplicates: true })

  return NextResponse.json({
    imported: toCreate.length,
    skipped: [...new Set(skipped)],
  })
}
