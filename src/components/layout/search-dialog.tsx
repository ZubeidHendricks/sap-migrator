'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Search, FolderKanban, Layers, Loader2 } from 'lucide-react'

interface SearchResult {
  projects: { id: string; name: string; status: string; approach: string }[]
  objects: { id: string; objectKey: string; objectName: string; category: string; status: string; projectId: string; project: { name: string } }[]
}

export function SearchDialog() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult>({ projects: [], objects: [] })
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen((o) => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQuery(''); setResults({ projects: [], objects: [] }); setCursor(0) }
  }, [open])

  const search = useCallback((q: string) => {
    clearTimeout(debounceRef.current)
    if (q.length < 2) { setResults({ projects: [], objects: [] }); setLoading(false); return }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data)
      setCursor(0)
      setLoading(false)
    }, 250)
  }, [])

  useEffect(() => { search(query) }, [query, search])

  const allItems = [
    ...results.projects.map((p) => ({ type: 'project' as const, id: p.id, label: p.name, sub: p.status.toLowerCase(), href: `/projects/${p.id}` })),
    ...results.objects.map((o) => ({ type: 'object' as const, id: o.id, label: o.objectName, sub: `${o.project.name} · ${o.category}`, href: `/projects/${o.projectId}/templates` })),
  ]

  function navigate(href: string) { router.push(href); setOpen(false) }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, allItems.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter' && allItems[cursor]) navigate(allItems[cursor].href)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-white/50 hover:bg-white/10 hover:text-white transition-colors text-sm"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="text-xs bg-white/10 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          {loading ? <Loader2 className="w-4 h-4 text-gray-400 shrink-0 animate-spin" /> : <Search className="w-4 h-4 text-gray-400 shrink-0" />}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search projects and objects…"
            className="flex-1 outline-none text-sm text-gray-900 placeholder:text-gray-400"
          />
          <kbd className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        {/* Results */}
        {allItems.length > 0 ? (
          <div className="max-h-80 overflow-y-auto py-2">
            {results.projects.length > 0 && (
              <div className="px-4 py-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Projects</p>
              </div>
            )}
            {results.projects.map((p, i) => {
              const idx = i
              return (
                <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors', cursor === idx ? 'bg-blue-50' : 'hover:bg-gray-50')}>
                  <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                    <FolderKanban className="w-3.5 h-3.5 text-[#1e3a5f]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{p.status.toLowerCase().replace('_', ' ')}</p>
                  </div>
                </button>
              )
            })}
            {results.objects.length > 0 && (
              <div className="px-4 py-1.5 mt-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Migration Objects</p>
              </div>
            )}
            {results.objects.map((o, i) => {
              const idx = results.projects.length + i
              return (
                <button key={o.id} onClick={() => navigate(`/projects/${o.projectId}/templates`)} className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors', cursor === idx ? 'bg-blue-50' : 'hover:bg-gray-50')}>
                  <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                    <Layers className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{o.objectName}</p>
                    <p className="text-xs text-gray-400">{o.project.name} · {o.category}</p>
                  </div>
                  <span className={cn('ml-auto text-xs px-1.5 py-0.5 rounded-full shrink-0', o.status === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>{o.status}</span>
                </button>
              )
            })}
          </div>
        ) : query.length >= 2 && !loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">No results for "{query}"</div>
        ) : query.length < 2 ? (
          <div className="py-6 text-center text-gray-400 text-sm">Type at least 2 characters to search</div>
        ) : null}
      </div>
    </div>
  )
}
