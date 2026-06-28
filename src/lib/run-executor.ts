import { prisma } from './prisma'
import { logAudit } from './audit'
import { notify } from './notifications'
import { sendRunCompleteEmail } from './email'

function pickError(): string {
  const errors = [
    'Required field BUKRS is missing',
    'Value "EUR" not found in value mapping for WAERS',
    'Date format invalid: expected YYYY-MM-DD',
    'Account group GRAL does not exist in target system',
    'Duplicate key: record already exists',
    'Field KUNNR exceeds maximum length of 10',
    'Cost centre 1000 not assigned to company code 0001',
    'Tax code V1 is not valid for country ZA',
  ]
  return errors[Math.floor(Math.random() * errors.length)]
}

/** Execute a run (currently simulated record-by-record). Marks it COMPLETED,
 *  writes RunRecords, audits, and notifies admins (in-app + email). */
export async function executeRun(opts: {
  runId: string
  objectIds: string[]
  projectId: string
  projectName: string
  runType: 'SIMULATION' | 'MIGRATION'
  orgId: string
  userId: string
}) {
  const { runId, objectIds, projectId, projectName, runType, orgId, userId } = opts
  await prisma.migrationRun.update({ where: { id: runId }, data: { status: 'RUNNING', startedAt: new Date() } }).catch(() => {})
  await new Promise((r) => setTimeout(r, 800))

  let totalRecords = 0, successCount = 0, errorCount = 0, warningCount = 0
  const records: { runId: string; projectObjectId: string; recordKey: string; status: 'SUCCESS' | 'ERROR' | 'WARNING'; message?: string }[] = []

  for (const objectId of objectIds) {
    const count = Math.floor(Math.random() * 50) + 10
    totalRecords += count
    for (let i = 1; i <= count; i++) {
      const rand = Math.random()
      let status: 'SUCCESS' | 'ERROR' | 'WARNING' = 'SUCCESS'
      let message: string | undefined
      if (rand < 0.08) { status = 'ERROR'; errorCount++; message = pickError() }
      else if (rand < 0.15) { status = 'WARNING'; warningCount++; message = 'Field truncated to allowed length' }
      else { successCount++ }
      records.push({ runId, projectObjectId: objectId, recordKey: `REC-${objectId.slice(-4)}-${i}`, status, message })
    }
  }

  await prisma.runRecord.createMany({ data: records })
  await prisma.migrationRun.update({
    where: { id: runId },
    data: { status: 'COMPLETED', completedAt: new Date(), totalRecords, successCount, errorCount, warningCount },
  })

  await logAudit({
    organizationId: orgId, userId, action: 'run.completed', entityType: 'run', entityId: runId, entityName: projectName,
    metadata: { runType, totalRecords, successCount, errorCount, warningCount },
  })

  const admins = await prisma.user.findMany({ where: { organizationId: orgId, role: 'ADMIN' }, select: { id: true, email: true } })
  await notify(admins.map((a) => ({
    userId: a.id, type: 'run.completed' as const,
    title: `${runType === 'SIMULATION' ? 'Simulation' : 'Migration'} completed — ${projectName}`,
    body: `${successCount} ok · ${errorCount} errors · ${warningCount} warnings of ${totalRecords} records`,
    link: `/projects/${projectId}/runs`,
  })))
  const appUrl = process.env.NEXTAUTH_URL || 'https://sap-migrator-5vybv.ondigitalocean.app'
  await sendRunCompleteEmail({
    to: admins.map((u) => u.email), projectName, runType, successCount, errorCount, warningCount, totalRecords,
    runUrl: `${appUrl}/projects/${projectId}/runs`,
  }).catch(() => {})
}
