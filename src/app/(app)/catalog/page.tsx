'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Boxes, Plus, Trash2, Loader2, Sparkles, Database } from 'lucide-react'

interface Field { name: string; label: string; type: string; required: boolean; maxLength?: number; example?: string }
interface CustomObject {
  id: string; key: string; name: string; category: string; description: string | null
  sapTable: string | null; approach: string[]; fields: Field[]; createdAt: string
}

const CATEGORIES = ['Finance', 'Controlling', 'Master Data', 'Logistics', 'Inventory', 'Human Resources', 'Basis']
const TYPES = ['string', 'number', 'date', 'boolean']

function emptyField(): Field { return { name: '', label: '', type: 'string', required: false } }

export default function CatalogPage() {
  const { data: session } = useSession()
  const isViewer = session?.user.role === 'VIEWER'
  const [objects, setObjects] = useState<CustomObject[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const [form, setForm] = useState({ key: '', name: '', category: 'Finance', description: '', sapTable: '' })
  const [approach, setApproach] = useState<string[]>(['STAGING_TABLES'])
  const [fields, setFields] = useState<Field[]>([emptyField()])

  function load() {
    fetch('/api/custom-objects').then((r) => r.json()).then((d) => Array.isArray(d) && setObjects(d)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  function reset() {
    setForm({ key: '', name: '', category: 'Finance', description: '', sapTable: '' })
    setApproach(['STAGING_TABLES']); setFields([emptyField()]); setError('')
  }

  function toggleApproach(a: string) {
    setApproach((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])
  }
  function setField(i: number, patch: Partial<Field>) {
    setFields((prev) => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSaving(true)
    const payload = {
      ...form,
      key: form.key.toUpperCase().trim(),
      approach,
      fields: fields.map((f) => ({
        name: f.name.trim(), label: f.label.trim(), type: f.type, required: f.required,
        ...(f.maxLength ? { maxLength: Number(f.maxLength) } : {}),
        ...(f.example ? { example: f.example } : {}),
      })),
    }
    const res = await fetch('/api/custom-objects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to create object'); setSaving(false); return }
    setObjects((o) => [data, ...o]); setSaving(false); setOpen(false); reset()
  }

  async function remove(id: string) {
    setDeleting(id)
    await fetch('/api/custom-objects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setObjects((o) => o.filter((x) => x.id !== id)); setDeleting(null)
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Boxes className="w-5 h-5 text-[#1e3a5f]" /> Object Catalog</h1>
          <p className="text-gray-500 mt-0.5">22 built-in SAP objects, plus your own custom definitions</p>
        </div>
        {!isViewer && (
          <Button className="bg-[#1e3a5f] hover:bg-[#2a4f7c] gap-2" onClick={() => { reset(); setOpen(true) }}>
            <Plus className="w-4 h-4" /> New Custom Object
          </Button>
        )}
      </div>

      <Card className="mb-6 border-gray-100 bg-gray-50/50">
        <CardContent className="pt-5 flex items-center gap-3">
          <Database className="w-4 h-4 text-gray-400" />
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">22 built-in objects</span> (GL Account, Customer, Vendor, Material…) are always available when selecting objects for a project. Custom objects you define below appear alongside them and flow through templates, validation, mapping, and the API.
          </p>
        </CardContent>
      </Card>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Custom Objects</h2>
      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : objects.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No custom objects yet</p>
          {!isViewer && <p className="text-xs mt-1">Create one to migrate objects beyond the built-in catalog.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {objects.map((o) => (
            <Card key={o.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[#1e3a5f] text-white"><Sparkles className="w-2.5 h-2.5" />Custom</span>
                      <p className="font-medium text-gray-900">{o.name}</p>
                      <code className="text-xs text-gray-400">{o.key}</code>
                    </div>
                    <p className="text-xs text-gray-400">{o.category} · {o.fields.length} fields · {o.approach.map((a) => a === 'STAGING_TABLES' ? 'Staging' : 'Direct').join(', ')}{o.sapTable ? ` · ${o.sapTable}` : ''}</p>
                    {o.description && <p className="text-xs text-gray-400 mt-1">{o.description}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {o.fields.slice(0, 8).map((f) => (
                        <span key={f.name} className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{f.name}{f.required ? '*' : ''}</span>
                      ))}
                      {o.fields.length > 8 && <span className="text-[10px] text-gray-400">+{o.fields.length - 8}</span>}
                    </div>
                  </div>
                  {!isViewer && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500 shrink-0" onClick={() => remove(o.id)} disabled={deleting === o.id}>
                      {deleting === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Builder dialog */}
      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), reset()))}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Custom Object</DialogTitle>
            <DialogDescription>Define an SAP object and its fields. It will be available when selecting objects for any project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Object Key</Label>
                <Input placeholder="Z_PRICE_LIST" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toUpperCase() }))} required />
                <p className="text-[11px] text-gray-400">UPPERCASE, e.g. Z_PRICE_LIST</p>
              </div>
              <div className="space-y-1.5">
                <Label>Object Name</Label>
                <Input placeholder="Price List" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>SAP Table (optional)</Label>
                <Input placeholder="A004" value={form.sapTable} onChange={(e) => setForm((f) => ({ ...f, sapTable: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Approach</Label>
              <div className="flex gap-4">
                {[['STAGING_TABLES', 'Staging Tables'], ['DIRECT_TRANSFER', 'Direct Transfer']].map(([val, lbl]) => (
                  <label key={val} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={approach.includes(val)} onChange={() => toggleApproach(val)} className="rounded border-gray-300" />
                    {lbl}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Fields</Label>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1" onClick={() => setFields((f) => [...f, emptyField()])}>
                  <Plus className="w-3 h-3" /> Add Field
                </Button>
              </div>
              <div className="space-y-2">
                {fields.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input className="w-28 font-mono text-xs" placeholder="TECH_NAME" value={f.name} onChange={(e) => setField(i, { name: e.target.value.toUpperCase() })} required />
                    <Input className="flex-1 text-xs" placeholder="Label" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} required />
                    <select className="h-9 rounded-md border border-gray-200 text-xs px-1" value={f.type} onChange={(e) => setField(i, { type: e.target.value })}>
                      {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <Input className="w-16 text-xs" type="number" placeholder="len" value={f.maxLength ?? ''} onChange={(e) => setField(i, { maxLength: e.target.value ? Number(e.target.value) : undefined })} />
                    <label className="flex items-center gap-1 text-xs text-gray-500 shrink-0" title="Required">
                      <input type="checkbox" checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} className="rounded border-gray-300" />req
                    </label>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-gray-300 hover:text-red-500 shrink-0" onClick={() => setFields((fs) => fs.length > 1 ? fs.filter((_, idx) => idx !== i) : fs)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setOpen(false); reset() }}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-[#1e3a5f] hover:bg-[#2a4f7c]" disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating…</> : 'Create Object'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
