import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { resolveObject } from '@/lib/object-catalog'
import { suggestMappings } from '@/lib/field-matcher'
import { isLlmEnabled, suggestMappingsLlm } from '@/lib/llm-field-matcher'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { objectKey, headers } = await req.json()
  if (!objectKey || !Array.isArray(headers)) {
    return NextResponse.json({ error: 'objectKey and headers[] are required' }, { status: 400 })
  }

  const object = await resolveObject(objectKey, session.user.organizationId)
  if (!object) return NextResponse.json({ error: 'Unknown object' }, { status: 404 })

  const cleaned = headers.map(String)

  // Prefer the LLM when configured; fall back to the deterministic matcher.
  let engine: 'ai' | 'rules' = 'rules'
  let suggestions = null
  if (isLlmEnabled()) {
    suggestions = await suggestMappingsLlm(cleaned, object)
    if (suggestions) engine = 'ai'
  }
  if (!suggestions) suggestions = suggestMappings(cleaned, object)

  return NextResponse.json({ objectKey, engine, suggestions })
}
