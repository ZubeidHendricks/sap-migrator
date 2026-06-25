import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FolderKanban, Plus, TrendingUp, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const [projects, totalRuns] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        objects: { select: { status: true } },
        runs: { select: { status: true, type: true, successCount: true, totalRecords: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.migrationRun.count({
      where: { project: { organizationId: session.user.organizationId } },
    }),
  ])

  const stats = [
    { label: 'Total Projects', value: projects.length, icon: FolderKanban, color: 'text-blue-600' },
    { label: 'In Progress', value: projects.filter((p) => p.status === 'IN_PROGRESS').length, icon: TrendingUp, color: 'text-yellow-600' },
    { label: 'Completed', value: projects.filter((p) => p.status === 'COMPLETED').length, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Migration Runs', value: totalRuns, icon: Clock, color: 'text-purple-600' },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-0.5">
            Welcome back, {session.user.name?.split(' ')[0]}
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-[#1e3a5f] hover:bg-[#2a4f7c] gap-2">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
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
              {projects.slice(0, 5).map((p) => {
                const done = p.objects.filter((o) => o.status === 'DONE').length
                const pct = p.objects.length > 0 ? Math.round((done / p.objects.length) * 100) : 0
                const lastRun = p.runs[0]

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
                          {lastRun.type === 'SIMULATION' ? (
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          )}
                          <span className="text-xs text-gray-400 capitalize">
                            {lastRun.type.toLowerCase()}
                          </span>
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
