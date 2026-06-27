import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const source = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    include: {
      objects: { include: { mappings: true } },
    },
  })
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name } = await req.json()

  const clone = await prisma.project.create({
    data: {
      name: name ?? `${source.name} (copy)`,
      description: source.description,
      approach: source.approach,
      status: 'DRAFT',
      sourceSystem: source.sourceSystem,
      targetSystem: source.targetSystem,
      organizationId: source.organizationId,
      objects: {
        create: source.objects.map((o) => ({
          objectKey: o.objectKey,
          objectName: o.objectName,
          category: o.category,
          status: 'PENDING',
          mappings: {
            create: o.mappings.map((m) => ({
              fieldName: m.fieldName,
              fieldLabel: m.fieldLabel,
              sourceValue: m.sourceValue,
              targetValue: m.targetValue,
            })),
          },
        })),
      },
    },
  })

  await logAudit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: 'project.cloned',
    entityType: 'project',
    entityId: clone.id,
    entityName: clone.name,
    metadata: { sourceId: source.id, sourceName: source.name },
  })

  return NextResponse.json(clone, { status: 201 })
}
