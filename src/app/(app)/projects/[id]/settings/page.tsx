'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Loader2, ArrowLeft, Download, Trash2, Save } from 'lucide-react'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  approach: string
  sourceSystem: string | null
  targetSystem: string | null
  goLiveDate: string | null
}

export default function ProjectSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [form, setForm] = useState({ name: '', description: '', status: '', sourceSystem: '', targetSystem: '', goLiveDate: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`)
    const data = await res.json()
    setProject(data)
    setForm({
      name: data.name ?? '',
      description: data.description ?? '',
      status: data.status ?? 'DRAFT',
      sourceSystem: data.sourceSystem ?? '',
      targetSystem: data.targetSystem ?? '',
      goLiveDate: data.goLiveDate ? data.goLiveDate.slice(0, 10) : '',
    })
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description || null,
        status: form.status,
        sourceSystem: form.sourceSystem || null,
        targetSystem: form.targetSystem || null,
        goLiveDate: form.goLiveDate || null,
      }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed to save'); setSaving(false); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    router.push('/projects')
  }

  function handleExport() {
    window.location.href = `/api/projects/${id}/export`
  }

  if (!project) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/projects/${id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Settings</h1>
          <p className="text-gray-400 text-sm">{project.name}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {saved && <Alert className="border-green-200 bg-green-50 text-green-800"><AlertDescription>Changes saved.</AlertDescription></Alert>}

            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe this migration project…" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Go-Live Date</Label>
                <Input type="date" value={form.goLiveDate} onChange={(e) => setForm((f) => ({ ...f, goLiveDate: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source System</Label>
                <Input placeholder="e.g. SAP ECC 6.0" value={form.sourceSystem} onChange={(e) => setForm((f) => ({ ...f, sourceSystem: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Target System</Label>
                <Input placeholder="e.g. SAP S/4HANA 2023" value={form.targetSystem} onChange={(e) => setForm((f) => ({ ...f, targetSystem: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="bg-[#1e3a5f] hover:bg-[#2a4f7c]">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
        </Button>
      </form>

      <Separator className="my-8" />

      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>Download a full report of this project including all objects and run history.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Export as CSV
          </Button>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="text-red-700">Danger Zone</CardTitle>
          <CardDescription>This action is irreversible. All objects, templates, mappings, and runs will be deleted.</CardDescription>
        </CardHeader>
        <CardContent>
          {confirmDelete && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>Click Delete again to confirm. This cannot be undone.</AlertDescription>
            </Alert>
          )}
          <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
            {deleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : <><Trash2 className="w-4 h-4" />{confirmDelete ? 'Confirm Delete' : 'Delete Project'}</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
