'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, CornerDownLeft } from 'lucide-react'

const SUGGESTIONS = [
  'Which objects have validation errors?',
  'What still needs to be done before go-live?',
  'Which objects have no owner?',
  'Are there any duplicate keys or anomalies?',
]

export function ProjectAsk({ projectId }: { projectId: string }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [engine, setEngine] = useState<'ai' | 'rules' | null>(null)

  async function ask(question: string) {
    const text = question.trim()
    if (!text) return
    setQ(text); setBusy(true); setAnswer(null)
    const res = await fetch(`/api/projects/${projectId}/ask`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: text }),
    })
    if (res.ok) { const d = await res.json(); setAnswer(d.answer); setEngine(d.engine) }
    else setAnswer('Sorry — could not answer that right now.')
    setBusy(false)
  }

  return (
    <Card className="mb-8 border-[#1e3a5f]/15 bg-gradient-to-br from-blue-50/40 to-transparent">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#1e3a5f]" />
          <p className="text-sm font-semibold text-gray-700">Ask about this project</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(q) }} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Which objects aren't ready yet?" className="pr-9" />
            <CornerDownLeft className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
          </div>
          <Button type="submit" disabled={busy || !q.trim()} className="bg-[#1e3a5f] hover:bg-[#2a4f7c] shrink-0">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}
          </Button>
        </form>

        {!answer && !busy && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-[#1e3a5f]/40 hover:text-[#1e3a5f] transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}

        {busy && <div className="mt-4 flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Thinking…</div>}

        {answer && !busy && (
          <div className="mt-4 rounded-lg bg-white border border-gray-100 p-3.5">
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{answer}</p>
            <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
              {engine === 'ai' ? <><Sparkles className="w-3 h-3 text-[#1e3a5f]" /> Answered by Claude AI from your project data</> : 'Project summary (enable AI for richer answers)'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
