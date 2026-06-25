import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { FolderKanban, Plus, ArrowRight, Database, GitMerge } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const projects = await prisma.project.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      objects: { select: { status: true } },
      _count: { select: { runs: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-0.5">{projects.length} migration project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-[#1e3a5f] hover:bg-[#2a4f7c] gap-2">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-24">
          <FolderKanban className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No projects yet</h3>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">
            Create your first migration project to start selecting SAP objects and preparing your data.
          </p>
          <Link href="/projects/new">
            <Button className="bg-[#1e3a5f] hover:bg-[#2a4f7c] gap-2">
              <Plus className="w-4 h-4" /> Create first project
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => {
            const done = p.objects.filter((o) => o.status === 'DONE').length
            const pct = p.objects.length > 0 ? Math.round((done / p.objects.length) * 100) : 0

            return (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="h-full hover:shadow-md transition-all hover:border-[#1e3a5f]/30 cursor-pointer group">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <FolderKanban className="w-5 h-5 text-[#1e3a5f]" />
                      </div>
                      <StatusBadge status={p.status} />
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-[#1e3a5f] transition-colors">
                      {p.name}
                    </h3>
                    {p.description && (
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{p.description}</p>
                    )}

                    <div className="flex items-center gap-2 mb-4">
                      {p.approach === 'STAGING_TABLES' ? (
                        <Database className="w-3.5 h-3.5 text-gray-400" />
                      ) : (
                        <GitMerge className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      <span className="text-xs text-gray-400">
                        {p.approach === 'STAGING_TABLES' ? 'Staging Tables' : 'Direct Transfer'}
                      </span>
                    </div>

                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{p.objects.length} objects selected</span>
                        <span>{pct}% ready</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{p._count.runs} run{p._count.runs !== 1 ? 's' : ''}</span>
                      <span>{formatDate(p.updatedAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}

          {/* New project card */}
          <Link href="/projects/new">
            <Card className="h-full border-dashed hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="pt-6 flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                <div className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center mb-3 group-hover:border-[#1e3a5f]/50">
                  <Plus className="w-5 h-5 text-gray-300 group-hover:text-[#1e3a5f]/50" />
                </div>
                <p className="text-sm text-gray-400 group-hover:text-gray-600">New project</p>
              </CardContent>
            </Card>
          </Link>
        </div>
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
