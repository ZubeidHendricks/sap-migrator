'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MIGRATION_OBJECTS, getObjectsByCategory, type MigrationObject } from '@/lib/migration-objects'
import { ArrowLeft, Search, CheckCircle, Plus, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORY_COLORS: Record<string, string> = {
  Finance: 'bg-blue-50 text-blue-700 border-blue-200',
  Controlling: 'bg-purple-50 text-purple-700 border-purple-200',
  'Master Data': 'bg-green-50 text-green-700 border-green-200',
  Logistics: 'bg-orange-50 text-orange-700 border-orange-200',
  Inventory: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Human Resources': 'bg-pink-50 text-pink-700 border-pink-200',
  Basis: 'bg-gray-50 text-gray-700 border-gray-200',
}

export default function ObjectsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [approach, setApproach] = useState<'STAGING_TABLES' | 'DIRECT_TRANSFER' | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [existing, setExisting] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${params.id}`).then((r) => r.json()),
      fetch(`/api/projects/${params.id}/objects`).then((r) => r.json()),
    ]).then(([project, objects]) => {
      setApproach(project.approach)
      const keys = new Set<string>(objects.map((o: any) => o.objectKey))
      setExisting(keys)
      setSelected(new Set(keys))
    }).finally(() => setLoading(false))
  }, [params.id])

  const filtered = MIGRATION_OBJECTS.filter((o) => {
    const matchesApproach = !approach || o.approach.includes(approach)
    const matchesSearch = search === '' || o.name.toLowerCase().includes(search.toLowerCase()) || o.key.toLowerCase().includes(search.toLowerCase()) || o.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === 'All' || o.category === category
    return matchesApproach && matchesSearch && matchesCategory
  })

  const categories = ['All', ...Array.from(new Set(MIGRATION_OBJECTS.map((o) => o.category)))]

  function toggle(key: string) {
    setSelected((s) => {
      const next = new Set(s)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const toAdd = Array.from(selected).filter((k) => !existing.has(k))
      const toRemove = Array.from(existing).filter((k) => !selected.has(k))

      if (toAdd.length > 0) {
        await fetch(`/api/projects/${params.id}/objects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ objectKeys: toAdd }),
        })
      }

      for (const key of toRemove) {
        await fetch(`/api/projects/${params.id}/objects`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ objectKey: key }),
        })
      }

      router.push(`/projects/${params.id}`)
    } catch {
      setError('Failed to save objects')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/projects/${params.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Select Migration Objects</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {selected.size} selected · {approach === 'STAGING_TABLES' ? 'Staging Tables approach' : 'Direct Transfer approach'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push(`/projects/${params.id}`)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#2a4f7c] gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : `Save ${selected.size} Objects`}
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* Selected chips */}
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          {Array.from(selected).map((key) => {
            const obj = MIGRATION_OBJECTS.find((o) => o.key === key)
            return (
              <Badge key={key} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                {obj?.name ?? key}
                <button onClick={() => toggle(key)} className="ml-1 hover:text-red-500 rounded-full">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search objects…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                category === c
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Object grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((obj) => {
          const isSelected = selected.has(obj.key)
          return (
            <button
              key={obj.key}
              onClick={() => toggle(obj.key)}
              className={cn(
                'flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all hover:shadow-sm',
                isSelected ? 'border-[#1e3a5f] bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                isSelected ? 'bg-[#1e3a5f] border-[#1e3a5f]' : 'border-gray-300'
              )}>
                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white fill-current" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-medium text-sm text-gray-900">{obj.name}</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border shrink-0', CATEGORY_COLORS[obj.category] ?? 'bg-gray-50 text-gray-700')}>
                    {obj.category}
                  </span>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{obj.description}</p>
                {obj.sapTable && (
                  <p className="text-xs text-gray-300 mt-1 font-mono">{obj.sapTable}</p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No objects match your search</p>
        </div>
      )}
    </div>
  )
}
