'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle } from 'lucide-react'

function ResetForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setSaving(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: form.password }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Something went wrong'); setSaving(false); return }
    setDone(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Invalid reset link. Please request a new one.</AlertDescription>
      </Alert>
    )
  }

  return done ? (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-green-50 text-green-800 p-4 rounded-lg">
        <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Password reset!</p>
          <p className="text-sm mt-0.5">Redirecting you to login…</p>
        </div>
      </div>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="space-y-2">
        <Label>New password</Label>
        <Input type="password" placeholder="At least 8 characters" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required autoFocus />
      </div>
      <div className="space-y-2">
        <Label>Confirm new password</Label>
        <Input type="password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} required />
      </div>
      <Button type="submit" className="w-full bg-[#1e3a5f] hover:bg-[#2a4f7c]" disabled={saving}>
        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting…</> : 'Set new password'}
      </Button>
      <Link href="/login" className="block text-center text-sm text-gray-500 hover:text-gray-700">Cancel</Link>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <Card className="w-full max-w-md shadow-lg border-gray-100">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Reset password</CardTitle>
        <CardDescription>Enter your new password below.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="py-4 text-center text-gray-400 text-sm">Loading…</div>}>
          <ResetForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
