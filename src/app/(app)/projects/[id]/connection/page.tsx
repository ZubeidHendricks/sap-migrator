'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Server, Shield, CheckCircle, Loader2, Trash2, Eye, EyeOff, Info } from 'lucide-react'

interface Connection {
  id: string
  host: string
  instanceNumber: string
  client: string
  username: string
  password: string
  systemId: string | null
  isVerified: boolean
  lastTestedAt: string | null
}

export default function ConnectionPage() {
  const params = useParams<{ id: string }>()
  const [conn, setConn] = useState<Connection | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    host: '', instanceNumber: '', client: '', username: '', password: '', systemId: '',
  })

  useEffect(() => {
    fetch(`/api/projects/${params.id}/connection`)
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setConn(data)
          setForm({
            host: data.host,
            instanceNumber: data.instanceNumber,
            client: data.client,
            username: data.username,
            password: '',
            systemId: data.systemId ?? '',
          })
        }
      })
      .finally(() => setLoading(false))
  }, [params.id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    const res = await fetch(`/api/projects/${params.id}/connection`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Save failed') }
    else { setConn(data); setSuccess('Connection saved. Credentials are stored securely.') }
    setSaving(false)
  }

  async function handleRemove() {
    if (!confirm('Remove SAP connection for this project?')) return
    setRemoving(true)
    await fetch(`/api/projects/${params.id}/connection`, { method: 'DELETE' })
    setConn(null)
    setForm({ host: '', instanceNumber: '', client: '', username: '', password: '', systemId: '' })
    setRemoving(false)
    setSuccess('Connection removed.')
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/projects/${params.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">SAP Connection</h1>
          <p className="text-gray-500 text-sm">Store the connection details for your SAP S/4HANA target system</p>
        </div>
        {conn && (
          <Badge className={conn.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
            {conn.isVerified ? <><CheckCircle className="w-3 h-3 mr-1" />Verified</> : 'Not verified'}
          </Badge>
        )}
      </div>

      <Alert className="mb-6 border-blue-100 bg-blue-50">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          These credentials are used by the Run Center to connect directly to your SAP system for simulation and migration runs.
          They are stored securely and never displayed in full after saving.
        </AlertDescription>
      </Alert>

      {loading ? (
        <Card><CardContent className="pt-6 text-center text-gray-400">Loading…</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Server className="w-4 h-4 text-[#1e3a5f]" />
              </div>
              <div>
                <CardTitle className="text-base">Application Server Details</CardTitle>
                <CardDescription>ABAP connection parameters for your SAP S/4HANA system</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
            {success && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg text-sm mb-4">
                <CheckCircle className="w-4 h-4 shrink-0" /> {success}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Application Server Host <span className="text-red-500">*</span></Label>
                  <Input placeholder="s4h.company.com or 10.0.0.1" value={form.host} onChange={set('host')} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Instance Number <span className="text-red-500">*</span></Label>
                  <Input placeholder="00" maxLength={2} value={form.instanceNumber} onChange={set('instanceNumber')} required />
                  <p className="text-xs text-gray-400">2-digit number, e.g. 00</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Client <span className="text-red-500">*</span></Label>
                  <Input placeholder="100" maxLength={3} value={form.client} onChange={set('client')} required />
                  <p className="text-xs text-gray-400">3-digit client, e.g. 100</p>
                </div>
                <div className="space-y-1.5">
                  <Label>SAP Username <span className="text-red-500">*</span></Label>
                  <Input placeholder="MIGRATION_USR" value={form.username} onChange={set('username')} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Password <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      type={showPw ? 'text' : 'password'}
                      placeholder={conn ? '••••••••  (leave blank to keep current)' : 'Password'}
                      value={form.password}
                      onChange={set('password')}
                      required={!conn}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>System ID (SID) <span className="text-gray-400 font-normal">— optional</span></Label>
                  <Input placeholder="S4H" maxLength={3} value={form.systemId} onChange={set('systemId')} />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2a4f7c]" disabled={saving}>
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : 'Save Connection'}
                </Button>
                {conn && (
                  <Button type="button" variant="ghost" className="text-red-500 hover:text-red-700 gap-2" onClick={handleRemove} disabled={removing}>
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6 border-gray-100">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div className="text-sm text-gray-500 space-y-1">
              <p className="font-medium text-gray-700">Required SAP authorisations</p>
              <p>The SAP user needs the following objects: <code className="text-xs bg-gray-100 px-1 rounded">S_MIGR_CKP</code> (Migration Cockpit),
                <code className="text-xs bg-gray-100 px-1 rounded ml-1">S_RFC</code> (Remote Function Call), and execute access on the LTMOM/LTMC programs.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
