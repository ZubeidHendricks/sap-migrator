import { Resend } from 'resend'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const FROM = 'SAP Migrator <noreply@sapmigrator.app>'

export async function sendInviteEmail({
  to,
  name,
  inviterName,
  orgName,
  tempPassword,
  loginUrl,
}: {
  to: string
  name: string
  inviterName: string
  orgName: string
  tempPassword: string
  loginUrl: string
}) {
  const resend = getResend()
  if (!resend) return

  await resend.emails.send({
    from: FROM,
    to,
    subject: `You've been invited to ${orgName} on SAP Migrator`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#1e3a5f;margin:0 0 8px">You've been invited</h2>
        <p style="color:#555;margin:0 0 24px">${inviterName} has added you to <strong>${orgName}</strong> on SAP Migrator.</p>
        <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin-bottom:24px">
          <p style="margin:0 0 8px;font-size:14px;color:#333"><strong>Email:</strong> ${to}</p>
          <p style="margin:0;font-size:14px;color:#333"><strong>Temporary password:</strong> <code style="background:#e9ecef;padding:2px 6px;border-radius:4px">${tempPassword}</code></p>
        </div>
        <p style="font-size:13px;color:#888;margin:0 0 20px">Please change your password after your first login.</p>
        <a href="${loginUrl}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Log in now</a>
      </div>
    `,
  })
}

export async function sendRunCompleteEmail({
  to,
  projectName,
  runType,
  successCount,
  errorCount,
  warningCount,
  totalRecords,
  runUrl,
}: {
  to: string[]
  projectName: string
  runType: 'SIMULATION' | 'MIGRATION'
  successCount: number
  errorCount: number
  warningCount: number
  totalRecords: number
  runUrl: string
}) {
  const resend = getResend()
  if (!resend || to.length === 0) return

  const pct = totalRecords > 0 ? Math.round((successCount / totalRecords) * 100) : 0
  const label = runType === 'SIMULATION' ? 'Simulation' : 'Migration'
  const statusColor = errorCount === 0 ? '#15803d' : '#b91c1c'
  const statusText = errorCount === 0 ? 'Completed successfully' : `${errorCount} error${errorCount > 1 ? 's' : ''} found`

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${label} run complete — ${projectName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#1e3a5f;margin:0 0 4px">${label} Run Complete</h2>
        <p style="color:#555;margin:0 0 20px">Project: <strong>${projectName}</strong></p>
        <p style="color:${statusColor};font-weight:600;margin:0 0 20px">${statusText}</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
          <div style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center">
            <p style="margin:0;font-size:24px;font-weight:700;color:#15803d">${successCount}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#16a34a">Success</p>
          </div>
          <div style="background:#fef2f2;border-radius:8px;padding:16px;text-align:center">
            <p style="margin:0;font-size:24px;font-weight:700;color:#b91c1c">${errorCount}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#dc2626">Errors</p>
          </div>
          <div style="background:#fefce8;border-radius:8px;padding:16px;text-align:center">
            <p style="margin:0;font-size:24px;font-weight:700;color:#a16207">${warningCount}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#ca8a04">Warnings</p>
          </div>
        </div>
        <p style="font-size:13px;color:#888;margin:0 0 20px">Success rate: ${pct}% of ${totalRecords} records</p>
        ${errorCount > 0 ? '<p style="font-size:13px;color:#555;margin:0 0 20px">Download the correction file from the Run Center, fix the errors, and re-upload.</p>' : ''}
        <a href="${runUrl}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">View Run Details</a>
      </div>
    `,
  })
}

export async function sendWelcomeEmail({
  to,
  name,
  orgName,
  loginUrl,
}: {
  to: string
  name: string
  orgName: string
  loginUrl: string
}) {
  const resend = getResend()
  if (!resend) return

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Welcome to SAP Migrator — ${orgName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#1e3a5f;margin:0 0 8px">Welcome, ${name}!</h2>
        <p style="color:#555;margin:0 0 24px">Your workspace <strong>${orgName}</strong> is ready. Start by creating your first migration project.</p>
        <a href="${loginUrl}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Go to dashboard</a>
      </div>
    `,
  })
}
