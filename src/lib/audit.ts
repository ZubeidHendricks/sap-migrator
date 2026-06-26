import { prisma } from './prisma'

export async function logAudit({
  organizationId,
  userId,
  action,
  entityType,
  entityId,
  entityName,
  metadata,
}: {
  organizationId: string
  userId: string
  action: string
  entityType?: string
  entityId?: string
  entityName?: string
  metadata?: Record<string, string | number | boolean | null>
}) {
  await prisma.auditLog.create({
    data: { organizationId, userId, action, entityType, entityId, entityName, metadata },
  }).catch(() => {})
}
