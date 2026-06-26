import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  FolderKanban, Layers, GitMerge, ArrowRight, Calendar,
  CheckCircle, AlertCircle, Play, FileSpreadsheet, MapPin, Server,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

import { SettingsIcon } from 'lucide-react'

const navCards = [
  { href: 'objects', label: 'Migration Objects', icon: Layers, desc: 'Select SAP objects to migrate from the catalog' },
  { href: 'mapping', label: 'Value Mapping', icon: MapPin, desc: 'Map source values to SAP target values' },
  { href: 'templates', label: 'Templates', icon: FileSpreadsheet, desc: 'Download XML templates and upload filled data' },
  { href: 'runs', label: 'Run Center', icon: Play, desc: 'Simulate and execute migration runs' },
  { href: 'connection', label: 'SAP Connection', icon: Server, desc: 'Store connection details for your SAP target system' },
  { href: 'settings', label: 'Project Settings', icon: SettingsIcon, desc: 'Edit name, status, go-live date and export data' },
]

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    include: {
      objects: true,
      runs: { orderBy: { createdAt: 'desc' }, take: 3 },
      sapConnection: { select: { isVerified: true } },
    },
  })

  if (!project) notFound()

  const done = project.objects.filter((o) => o.status === 'DONE').length
  const mapped = project.objects.filter((o) => ['MAPPED', 'READY', 'DONE'].includes(o.status)).length
  const pct = project.objects.length > 0 ? Math.round((done / project.objects.length) * 100) : 0

  const lastRun = project.runs[0]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <FolderKanban className="w-6 h-6 text-[#1e3a5f]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                {project.approach === 'STAGING_TABLES' ? (
                  <><FileSpreadsheet className="w-3.5 h-3.5" /> Staging Tables</>
                ) : (
                  <><GitMerge className="w-3.5 h-3.5" /> Direct Transfer</>
                )}
              </span>
              {project.goLiveDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Go-live {formatDate(project.goLiveDate)}
                </span>
              )}
              {project.sourceSystem && (
                <span>{project.sourceSystem} → {project.targetSystem}</span>
              )}
            </div>
          </div>
        </div>
        <Link href={`/projects/${project.id}/runs`}>
          <Button className="bg-[#1e3a5f] hover:bg-[#2a4f7c] gap-2">
            <Play className="w-4 h-4" /> Run
          </Button>
        </Link>
      </div>

      {/* Progress overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Objects Selected', value: project.objects.length, icon: Layers, color: 'text-blue-600' },
          { label: 'Mapped', value: mapped, icon: MapPin, color: 'text-yellow-600' },
          { label: 'Completed', value: done, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Migration Runs', value: project.runs.length, icon: Play, color: 'text-purple-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overall progress */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Overall Readiness</p>
            <p className="text-sm font-bold text-[#1e3a5f]">{pct}%</p>
          </div>
          <Progress value={pct} className="h-2.5" />
          <p className="text-xs text-gray-400 mt-2">
            {done} of {project.objects.length} objects fully ready for migration
          </p>
        </CardContent>
      </Card>

      {/* Nav cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {navCards.map((c) => (
          <Link key={c.href} href={`/projects/${project.id}/${c.href}`}>
            <Card className="hover:shadow-md hover:border-[#1e3a5f]/30 transition-all cursor-pointer group h-full">
              <CardContent className="pt-6">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                  <c.icon className="w-5 h-5 text-[#1e3a5f]" />
                </div>
                <h3 className="font-semibold text-sm text-gray-900 mb-1 group-hover:text-[#1e3a5f]">
                  {c.label}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">{c.desc}</p>
                <div className="flex items-center gap-1 mt-3 text-[#1e3a5f] text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Open <ArrowRight className="w-3 h-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent runs */}
      {project.runs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Runs</CardTitle>
            <Link href={`/projects/${project.id}/runs`} className="text-sm text-[#1e3a5f] hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {project.runs.map((run) => (
                <div key={run.id} className="flex items-center gap-4 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    run.status === 'COMPLETED' ? 'bg-green-50' : run.status === 'FAILED' ? 'bg-red-50' : 'bg-yellow-50'
                  }`}>
                    {run.status === 'COMPLETED' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {run.type === 'SIMULATION' ? 'Simulation' : 'Migration'} Run
                    </p>
                    <p className="text-xs text-gray-400">
                      {run.totalRecords} records · {run.successCount} success · {run.errorCount} errors
                    </p>
                  </div>
                  <div className="text-right">
                    <RunBadge status={run.status} />
                    <p className="text-xs text-gray-300 mt-0.5">{formatDate(run.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'info' }> = {
    DRAFT: { label: 'Draft', variant: 'secondary' },
    IN_PROGRESS: { label: 'In Progress', variant: 'info' },
    COMPLETED: { label: 'Completed', variant: 'success' },
    ARCHIVED: { label: 'Archived', variant: 'secondary' },
  }
  const s = map[status] ?? { label: status, variant: 'secondary' }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

function RunBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' }> = {
    PENDING: { label: 'Pending', variant: 'secondary' },
    RUNNING: { label: 'Running', variant: 'warning' },
    COMPLETED: { label: 'Completed', variant: 'success' },
    FAILED: { label: 'Failed', variant: 'default' },
  }
  const s = map[status] ?? { label: status, variant: 'secondary' }
  return <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
}
