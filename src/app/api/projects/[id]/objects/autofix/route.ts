import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { resolveObject } from '@/lib/object-catalog'
import type { MigrationObjectField } from '@/lib/migration-objects'
import { autoFixBatch, isLlmEnabled, autoFixLlm } from '@/lib/llm-auto-fix'

interface IssueInput { row: number; field: string; value: string; message?: string }

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { objectKey, issues } = await req.json()
  if (!objectKey || !Array.isArray(issues)) {
    return NextResponse.json({ error: 'objectKey and issues[] are required' }, { status: 400 })
  }

  const object = await resolveObject(objectKey, session.user.organizationId)
  if (!object) return NextResponse.json({ error: 'Unknown object' }, { status: 404 })

  const fieldsByName: Record<string, MigrationObjectField> = Object.fromEntries(object.fields.map((f) => [f.name, f]))
  // Only consider issues that carry a value and a known field.
  const inputs: IssueInput[] = (issues as IssueInput[])
    .filter((i) => i && typeof i.field === 'string' && typeof i.value === 'string' && i.value.trim() !== '')
    .slice(0, 200)

  let engine: 'ai' | 'rules' = 'rules'
  let fixes = null
  if (isLlmEnabled()) {
    fixes = await autoFixLlm(object, fieldsByName, inputs)
    if (fixes) engine = 'ai'
  }
  if (!fixes) fixes = autoFixBatch(fieldsByName, inputs)

  return NextResponse.json({ objectKey, engine, fixes })
}
