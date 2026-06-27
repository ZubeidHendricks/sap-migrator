import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  for (const line of lines) {
    const cells: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        cells.push(cur); cur = ''
      } else {
        cur += ch
      }
    }
    cells.push(cur)
    rows.push(cells)
  }
  return rows
}

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
  const rows = parseCSV(text)
  if (rows.length < 2) return NextResponse.json({ error: 'CSV must have a header and at least one data row' }, { status: 400 })

  // Build index of objectKey → projectObjectId
  const objIndex = Object.fromEntries(project.objects.map((o) => [o.objectKey, o.id]))

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const idx = {
    objectKey: header.indexOf('object key'),
    fieldName: header.indexOf('field name'),
    fieldLabel: header.indexOf('field label'),
    sourceValue: header.indexOf('source value'),
    targetValue: header.indexOf('target value'),
  }

  if (idx.objectKey < 0 || idx.fieldName < 0 || idx.sourceValue < 0 || idx.targetValue < 0) {
    return NextResponse.json({ error: 'CSV must have columns: Object Key, Field Name, Source Value, Target Value' }, { status: 400 })
  }

  const toCreate: { projectObjectId: string; fieldName: string; fieldLabel?: string; sourceValue: string; targetValue: string }[] = []
  const skipped: string[] = []

  for (const row of rows.slice(1)) {
    const objectKey = row[idx.objectKey]?.trim()
    const fieldName = row[idx.fieldName]?.trim()
    const sourceValue = row[idx.sourceValue]?.trim()
    const targetValue = row[idx.targetValue]?.trim()

    if (!objectKey || !fieldName || !sourceValue || !targetValue) continue

    const projectObjectId = objIndex[objectKey]
    if (!projectObjectId) { skipped.push(objectKey); continue }

    toCreate.push({
      projectObjectId,
      fieldName,
      fieldLabel: idx.fieldLabel >= 0 ? row[idx.fieldLabel]?.trim() || undefined : undefined,
      sourceValue,
      targetValue,
    })
  }

  await prisma.valueMapping.createMany({ data: toCreate, skipDuplicates: true })

  return NextResponse.json({
    imported: toCreate.length,
    skipped: [...new Set(skipped)],
  })
}
