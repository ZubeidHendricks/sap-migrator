'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Database, Loader2, KeyRound } from 'lucide-react'

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.next !== form.confirm) { setError('New passwords do not match'); return }
    if (form.next.length < 8) { setError('Password must be at least 8 characters'); return }
    setSaving(true)
    const res = await fetch('/api/auth/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to update password'); setSaving(false); return }
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-8 h-8 rounded-md bg-[#1e3a5f] flex items-center justify-center">
          <Database className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-lg text-[#1e3a5f]">SAP Migrator</span>
      </div>
      <Card className="w-full max-w-md shadow-lg border-gray-100">
        <CardHeader className="space-y-1">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
            <KeyRound className="w-5 h-5 text-[#1e3a5f]" />
          </div>
          <CardTitle className="text-2xl">Set your password</CardTitle>
          <CardDescription>
            Your account was created with a temporary password. Please set a new password before continuing.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-2">
              <Label>Temporary password</Label>
              <Input type="password" value={form.current} onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))} required autoFocus />
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input type="password" placeholder="At least 8 characters" value={form.next} onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Confirm new password</Label>
              <Input type="password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} required />
            </div>
          </CardContent>
          <div className="px-6 pb-6">
            <Button type="submit" className="w-full bg-[#1e3a5f] hover:bg-[#2a4f7c]" disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Set password & sign in'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
