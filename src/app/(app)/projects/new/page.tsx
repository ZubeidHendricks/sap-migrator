'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, Database, GitMerge, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const approaches = [
  {
    value: 'STAGING_TABLES',
    label: 'Staging Tables',
    icon: Database,
    desc: 'Upload data via MS Excel XML templates or fill staging tables directly. Supports 184+ migration objects. Works with SAP S/4HANA and S/4HANA Cloud.',
    pros: ['Excel XML file upload', 'ETL tool compatible', 'Cloud supported'],
  },
  {
    value: 'DIRECT_TRANSFER',
    label: 'Direct Transfer',
    icon: GitMerge,
    desc: 'Transfer data live from a source SAP system via RFC connection. Requires SAP ERP, AFS, EWM, CRM, or APO SPP as source. 255+ objects.',
    pros: ['No file export needed', '255+ objects', 'Live RFC transfer'],
  },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    description: '',
    approach: '' as 'STAGING_TABLES' | 'DIRECT_TRANSFER' | '',
    sourceSystem: '',
    targetSystem: '',
    goLiveDate: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.approach) { setError('Please select a migration approach'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create project')
      setLoading(false)
      return
    }

    const project = await res.json()
    router.push(`/projects/${project.id}/objects`)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/projects">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Migration Project</h1>
          <p className="text-gray-500 text-sm mt-0.5">Set up your project details and migration approach</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Acme S/4HANA Go-Live 2025"
                value={form.name}
                onChange={set('name')}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                placeholder="Brief description of the migration scope…"
                value={form.description}
                onChange={set('description')}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source">Source System</Label>
                <Input id="source" placeholder="e.g. SAP ECC 6.0" value={form.sourceSystem} onChange={set('sourceSystem')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">Target System</Label>
                <Input id="target" placeholder="e.g. SAP S/4HANA 2023" value={form.targetSystem} onChange={set('targetSystem')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="golive">Go-Live Date</Label>
              <Input id="golive" type="date" value={form.goLiveDate} onChange={set('goLiveDate')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Migration Approach *</CardTitle>
            <CardDescription>Choose how data will be transferred to S/4HANA</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {approaches.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, approach: a.value as any }))}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all',
                  form.approach === a.value
                    ? 'border-[#1e3a5f] bg-blue-50'
                    : 'border-gray-100 hover:border-gray-200'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                  form.approach === a.value ? 'bg-[#1e3a5f] text-white' : 'bg-gray-100 text-gray-500'
                )}>
                  <a.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">{a.label}</p>
                    {form.approach === a.value && (
                      <CheckCircle className="w-4 h-4 text-[#1e3a5f]" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{a.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {a.pros.map((pro) => (
                      <Badge key={pro} variant="secondary" className="text-xs">{pro}</Badge>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Link href="/projects">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2a4f7c] gap-2" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create & Select Objects →'}
          </Button>
        </div>
      </form>
    </div>
  )
}
