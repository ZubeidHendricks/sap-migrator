import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string; jobId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Ensure the job belongs to a project in the caller's org.
  const job = await prisma.dataExtractJob.findFirst({
    where: { id: params.jobId, projectId: params.id, project: { organizationId: session.user.organizationId } },
  })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!job.outputCsv) return NextResponse.json({ error: 'No downloadable output for this job' }, { status: 400 })

  return new NextResponse(job.outputCsv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="extract-${job.name.replace(/\s+/g, '-').toLowerCase()}.csv"`,
    },
  })
}
