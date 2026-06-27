'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { KeyRound, Plus, Trash2, Loader2, Copy, CheckCircle } from 'lucide-react'

interface ApiKey { id: string; name: string; keyPrefix: string; lastUsedAt: string | null; createdAt: string }

export function ApiKeysCard({ isAdmin }: { isAdmin: boolean }) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/api-keys').then((r) => r.json()).then((d) => Array.isArray(d) && setKeys(d)).finally(() => setLoading(false))
  }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setCreating(true)
    const res = await fetch('/api/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to create key'); setCreating(false); return }
    setNewKey(data.key)
    setKeys((k) => [{ id: data.id, name: data.name, keyPrefix: data.keyPrefix ?? data.key.slice(0, 16), lastUsedAt: null, createdAt: data.createdAt }, ...k])
    setName(''); setCreating(false)
  }

  async function revoke(id: string) {
    setRevoking(id)
    await fetch('/api/api-keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyId: id }) })
    setKeys((k) => k.filter((x) => x.id !== id))
    setRevoking(null)
  }

  function close() { setOpen(false); setNewKey(null); setError(''); setName('') }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-[#1e3a5f]" />
            </div>
            <div>
              <CardTitle className="text-base">API Keys</CardTitle>
              <CardDescription>Programmatic access for integrators — use with the <code className="text-xs">/api/v1</code> endpoints</CardDescription>
            </div>
          </div>
          {isAdmin && (
            <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#2a4f7c] gap-2"><Plus className="w-3.5 h-3.5" /> New Key</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>Give the key a name to identify where it&apos;s used.</DialogDescription>
                </DialogHeader>
                {newKey ? (
                  <div className="space-y-4 pt-2">
                    <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
                      <AlertDescription>Copy this key now — it won&apos;t be shown again.</AlertDescription>
                    </Alert>
                    <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg p-3 font-mono text-xs break-all">
                      <span>{newKey}</span>
                      <Button variant="ghost" size="sm" className="h-7 gap-1.5 shrink-0" onClick={() => { navigator.clipboard.writeText(newKey); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
                        {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <Button variant="outline" className="w-full" onClick={close}>Done</Button>
                  </div>
                ) : (
                  <form onSubmit={create} className="space-y-4 pt-2">
                    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                    <div className="space-y-2">
                      <Label>Key Name</Label>
                      <Input placeholder="e.g. Fivetran connector" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full bg-[#1e3a5f] hover:bg-[#2a4f7c]" disabled={creating}>
                      {creating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating…</> : 'Create Key'}
                    </Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-4 text-center text-sm text-gray-400">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400">No API keys yet.</div>
        ) : (
          <div className="divide-y">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{k.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{k.keyPrefix}••••••  ·  {k.lastUsedAt ? `last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : 'never used'}</p>
                </div>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => revoke(k.id)} disabled={revoking === k.id}>
                    {revoking === k.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
