import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { resolveObject } from '@/lib/object-catalog'
import { generateXmlTemplate, xmlTemplateFilename } from '@/lib/xml-generator'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const objectKey = searchParams.get('objectKey')
  if (!objectKey) return NextResponse.json({ error: 'objectKey required' }, { status: 400 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const def = await resolveObject(objectKey, session.user.organizationId)
  if (!def) return NextResponse.json({ error: 'Unknown migration object' }, { status: 400 })

  const xml = generateXmlTemplate(def)
  const filename = xmlTemplateFilename(objectKey)

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
