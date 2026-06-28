'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Palette, Loader2, CheckCircle } from 'lucide-react'

export function BrandingCard({ isAdmin }: { isAdmin: boolean }) {
  const [form, setForm] = useState({ name: '', brandColor: '', logoUrl: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/organizations/branding').then((r) => r.json()).then((d) => {
      setForm({ name: d.name ?? '', brandColor: d.brandColor ?? '', logoUrl: d.logoUrl ?? '' })
    }).finally(() => setLoading(false))
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSaving(true)
    const res = await fetch('/api/organizations/branding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, brandColor: form.brandColor || null, logoUrl: form.logoUrl || null }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to save'); setSaving(false); return }
    setSaved(true); setTimeout(() => setSaved(false), 2500); setSaving(false)
    // Reflect new branding immediately in the sidebar without a full reload.
    setTimeout(() => window.location.reload(), 300)
  }

  const preview = form.brandColor && /^#?[0-9a-fA-F]{6}$/.test(form.brandColor)
    ? (form.brandColor.startsWith('#') ? form.brandColor : `#${form.brandColor}`)
    : '#1e3a5f'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Palette className="w-4 h-4 text-[#1e3a5f]" />
          </div>
          <div>
            <CardTitle className="text-base">Branding</CardTitle>
            <CardDescription>White-label the app with your logo, name, and accent color</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-4 text-center text-sm text-gray-400">Loading…</div>
        ) : (
          <form onSubmit={save} className="space-y-4 max-w-md">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {saved && <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2.5 rounded-lg text-sm"><CheckCircle className="w-4 h-4" /> Branding saved</div>}
            <div className="space-y-1.5">
              <Label>Workspace Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} disabled={!isAdmin} required />
            </div>
            <div className="space-y-1.5">
              <Label>Accent Color (hex)</Label>
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-md border shrink-0" style={{ backgroundColor: preview }} />
                <Input placeholder="#1e3a5f" value={form.brandColor} onChange={(e) => setForm((f) => ({ ...f, brandColor: e.target.value }))} disabled={!isAdmin} />
              </div>
              <p className="text-[11px] text-gray-400">Applied to the sidebar. Leave blank for the default navy.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Logo URL</Label>
              <Input placeholder="https://…/logo.png" value={form.logoUrl} onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))} disabled={!isAdmin} />
              <p className="text-[11px] text-gray-400">Shown in the sidebar header. Square images work best.</p>
            </div>
            {isAdmin && (
              <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2a4f7c]" disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : 'Save Branding'}
              </Button>
            )}
            {!isAdmin && <p className="text-xs text-gray-400">Only admins can change branding.</p>}
          </form>
        )}
      </CardContent>
    </Card>
  )
}
