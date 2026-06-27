'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, FolderKanban, Database, Gauge, TrendingUp, ArrowRight } from 'lucide-react'

interface ProjectStat {
  id: string
  name: string
  status: string
  objectCount: number
  readiness: number
  qualityScore: number
  qualityGrade: string
  runCount: number
  recordsMigrated: number
  errorRate: number
}

interface Insights {
  totals: { projects: number; objects: number; recordsMigrated: number; avgQuality: number; avgReadiness: number }
  projects: ProjectStat[]
}

const GRADE_COLOR: Record<string, string> = {
  A: 'text-green-600 bg-green-50',
  B: 'text-green-600 bg-green-50',
  C: 'text-yellow-600 bg-yellow-50',
  D: 'text-orange-600 bg-orange-50',
  F: 'text-red-600 bg-red-50',
}

export default function InsightsPage() {
  const [data, setData] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/insights').then((r) => r.json()).then(setData).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#1e3a5f]" /> Insights
        </h1>
        <p className="text-gray-500 mt-0.5">Data quality scores and migration analytics across all your projects</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          <Skeleton className="h-64" />
        </div>
      ) : !data || data.projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No projects to analyze yet</p>
        </div>
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Projects', value: data.totals.projects, icon: FolderKanban, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Objects', value: data.totals.objects, icon: Database, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Records Migrated', value: data.totals.recordsMigrated.toLocaleString(), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Avg Quality', value: `${data.totals.avgQuality}/100`, icon: Gauge, color: 'text-[#1e3a5f]', bg: 'bg-blue-50' },
            ].map((s) => (
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

          {/* Per-project quality */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Quality & Velocity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {data.projects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-4 py-4 hover:bg-gray-50 -mx-6 px-6 transition-colors group">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${GRADE_COLOR[p.qualityGrade] ?? 'text-gray-500 bg-gray-50'}`}>
                      {p.qualityGrade}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate group-hover:text-[#1e3a5f]">{p.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <Progress value={p.qualityScore} className="h-1.5 w-28" />
                        <span className="text-xs text-gray-400">{p.qualityScore}/100 quality</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{p.objectCount} objects</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{p.readiness}% ready</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">{p.recordsMigrated.toLocaleString()} migrated</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.errorRate}% errors · {p.runCount} runs</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#1e3a5f] shrink-0" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
