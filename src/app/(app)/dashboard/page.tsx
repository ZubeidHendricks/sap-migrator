import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  FolderKanban, Plus, TrendingUp, CheckCircle, AlertCircle, Clock,
  Database, BarChart3, Target, Activity,
} from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const [projects, runs, recentActivity] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        objects: { select: { status: true } },
        runs: {
          select: { status: true, type: true, successCount: true, totalRecords: true, errorCount: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.migrationRun.findMany({
      where: { project: { organizationId: session.user.organizationId }, status: 'COMPLETED' },
      select: { type: true, successCount: true, totalRecords: true, errorCount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.auditLog.findMany({
      where: { organizationId: session.user.organizationId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ])

  const totalRecordsMigrated = runs
    .filter((r) => r.type === 'MIGRATION')
    .reduce((sum, r) => sum + r.successCount, 0)

  const recentRuns = runs.slice(0, 10)
  const avgErrorRate = recentRuns.length > 0
    ? Math.round(recentRuns.reduce((sum, r) => sum + (r.totalRecords > 0 ? r.errorCount / r.totalRecords : 0), 0) / recentRuns.length * 100)
    : 0

  const allObjects = projects.flatMap((p) => p.objects)
  const readyObjects = allObjects.filter((o) => o.status === 'DONE' || o.status === 'READY').length
  const readinessPct = allObjects.length > 0 ? Math.round((readyObjects / allObjects.length) * 100) : 0

  const stats = [
    { label: 'Total Projects', value: projects.length, icon: FolderKanban, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'In Progress', value: projects.filter((p) => p.status === 'IN_PROGRESS').length, icon: TrendingUp, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Records Migrated', value: totalRecordsMigrated.toLocaleString(), icon: Database, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Avg Error Rate', value: `${avgErrorRate}%`, icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-0.5">Welcome back, {session.user.name?.split(' ')[0]}</p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-[#1e3a5f] hover:bg-[#2a4f7c] gap-2">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overall readiness */}
      {allObjects.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-4 h-4 text-[#1e3a5f]" />
              <p className="text-sm font-medium text-gray-700">Overall Object Readiness</p>
              <span className="ml-auto text-sm font-bold text-[#1e3a5f]">{readinessPct}%</span>
            </div>
            <Progress value={readinessPct} className="h-2.5" />
            <p className="text-xs text-gray-400 mt-2">
              {readyObjects} of {allObjects.length} objects ready across all projects
            </p>
          </CardContent>
        </Card>
      )}

      {/* Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Projects</CardTitle>
          <Link href="/projects" className="text-sm text-[#1e3a5f] hover:underline">View all</Link>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No projects yet</p>
              <Link href="/projects/new">
                <Button className="bg-[#1e3a5f] hover:bg-[#2a4f7c] gap-2">
                  <Plus className="w-4 h-4" /> Create your first project
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {projects.slice(0, 6).map((p) => {
                const done = p.objects.filter((o) => o.status === 'DONE').length
                const pct = p.objects.length > 0 ? Math.round((done / p.objects.length) * 100) : 0
                const lastRun = p.runs[0]
                const hasErrors = lastRun && lastRun.errorCount > 0

                return (
                  <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-4 py-4 hover:bg-gray-50 -mx-6 px-6 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <FolderKanban className="w-4 h-4 text-[#1e3a5f]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-gray-900 text-sm truncate">{p.name}</p>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={pct} className="h-1.5 w-24" />
                        <span className="text-xs text-gray-400">{pct}% ready</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400">{p.objects.length} objects</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {lastRun ? (
                        <div className="flex items-center gap-1.5">
                          {hasErrors
                            ? <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                            : <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                          <span className="text-xs text-gray-400 capitalize">{lastRun.type.toLowerCase()}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No runs</span>
                      )}
                      <p className="text-xs text-gray-300 mt-0.5">{formatRelativeDate(p.updatedAt)}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom row: runs + recent activity */}
      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        {runs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" /> Recent Run Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {runs.slice(0, 5).map((r, i) => {
                  const pct = r.totalRecords > 0 ? Math.round((r.successCount / r.totalRecords) * 100) : 0
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${r.errorCount === 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 capitalize">{r.type.toLowerCase()} run</span>
                          <span className="text-xs text-gray-400">{pct}% success</span>
                        </div>
                        <Progress value={pct} className="h-1" />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 w-20 text-right">{formatRelativeDate(r.createdAt)}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {recentActivity.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-400" /> Recent Activity
              </CardTitle>
              <Link href="/activity" className="text-xs text-[#1e3a5f] hover:underline">View all</Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-900">
                        <span className="font-medium">{log.user.name ?? log.user.email}</span>
                        {' '}<span className="text-gray-500">{log.action.replace('.', ' ').replace('_', ' ')}</span>
                        {log.entityName && <span className="text-gray-400"> — {log.entityName}</span>}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{formatRelativeDate(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
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
  return <Badge variant={s.variant} className="text-xs py-0">{s.label}</Badge>
}
