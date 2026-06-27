'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Gauge, CalendarClock, Sparkles } from 'lucide-react'

interface Insights {
  quality: { score: number; grade: string }
  timeline: { remainingObjects: number; estimatedDays: number; confidence: string; summary: string }
  avgErrorRate: number
  teamSize: number
}

const GRADE_COLOR: Record<string, string> = {
  A: 'text-green-600', B: 'text-green-600', C: 'text-yellow-600', D: 'text-orange-600', F: 'text-red-500',
}

export function ProjectInsightsCard({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/insights`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading || !data) return null

  return (
    <Card className="mb-8 border-[#1e3a5f]/15 bg-gradient-to-br from-blue-50/40 to-transparent">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-[#1e3a5f]" />
          <p className="text-sm font-semibold text-gray-700">Migration Intelligence</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Quality score */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${GRADE_COLOR[data.quality.grade] ?? 'text-gray-500'} bg-white border-4 border-gray-100`}>
                {data.quality.grade}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <Gauge className="w-3.5 h-3.5" /> Data Quality Score
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.quality.score}<span className="text-sm text-gray-400 font-normal">/100</span></p>
              <Progress value={data.quality.score} className="h-1.5 mt-1.5" />
            </div>
          </div>

          {/* Timeline */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0">
              <CalendarClock className="w-4 h-4 text-[#1e3a5f]" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                Estimated Effort
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                  data.timeline.confidence === 'High' ? 'bg-green-50 text-green-600' :
                  data.timeline.confidence === 'Medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-500'
                }`}>{data.timeline.confidence} confidence</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {data.timeline.estimatedDays}<span className="text-sm text-gray-400 font-normal"> working day{data.timeline.estimatedDays !== 1 ? 's' : ''}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1 leading-snug">{data.timeline.summary}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
