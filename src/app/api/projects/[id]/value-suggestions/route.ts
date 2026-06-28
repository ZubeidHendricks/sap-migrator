import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { resolveObject } from '@/lib/object-catalog'
import { suggestValues } from '@/lib/value-mapper'
import { isLlmEnabled, suggestValuesLlm } from '@/lib/llm-value-mapper'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { objectKey, fieldName, sourceValues } = await req.json()
  if (!objectKey || !fieldName || !Array.isArray(sourceValues)) {
    return NextResponse.json({ error: 'objectKey, fieldName and sourceValues[] are required' }, { status: 400 })
  }

  const object = await resolveObject(objectKey, session.user.organizationId)
  if (!object) return NextResponse.json({ error: 'Unknown object' }, { status: 404 })
  const field = object.fields.find((f) => f.name === fieldName)
  if (!field) return NextResponse.json({ error: 'Unknown field' }, { status: 404 })

  const values = sourceValues.map(String)

  let engine: 'ai' | 'rules' = 'rules'
  let suggestions = null
  if (isLlmEnabled()) {
    suggestions = await suggestValuesLlm(object, field, values)
    if (suggestions) engine = 'ai'
  }
  if (!suggestions) suggestions = suggestValues(field, values)

  return NextResponse.json({ objectKey, fieldName, engine, suggestions })
}
