'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Building2, Users, Shield, Plus, Trash2, Loader2, Copy, CheckCircle, KeyRound, Bell, User } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { ApiKeysCard } from '@/components/settings/api-keys-card'
import { BrandingCard } from '@/components/settings/branding-card'
import { LanguageCard } from '@/components/settings/language-card'
import { useT } from '@/lib/i18n/context'

interface Member { id: string; name: string | null; email: string; role: string; createdAt: string }
interface NotifPrefs { runComplete: boolean; memberInvited: boolean }
interface ProfileForm { name: string }

export default function SettingsPage() {
  const { data: session } = useSession()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'MIGRATOR' })
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ email: string; tempPassword: string } | null>(null)
  const [inviteError, setInviteError] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const isAdmin = session?.user.role === 'ADMIN'
  const t = useT()
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({ runComplete: true, memberInvited: true })
  const [profileForm, setProfileForm] = useState<ProfileForm>({ name: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  useEffect(() => {
    fetch('/api/organizations/members')
      .then((r) => r.json())
      .then(setMembers)
      .finally(() => setLoading(false))
    if (session?.user.name) setProfileForm({ name: session.user.name })
  }, [session])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteError('')
    const res = await fetch('/api/organizations/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteForm),
    })
    const data = await res.json()
    if (!res.ok) {
      setInviteError(data.error || 'Failed to invite member')
      setInviting(false)
      return
    }
    setInviteResult({ email: data.email, tempPassword: data.tempPassword })
    setMembers((m) => [...m, data])
    setInviting(false)
    setInviteForm({ name: '', email: '', role: 'MIGRATOR' })
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId)
    await fetch('/api/organizations/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setMembers((m) => m.filter((u) => u.id !== userId))
    setRemovingId(null)
  }

  function copyPassword(pwd: string) {
    navigator.clipboard.writeText(pwd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match'); return }
    if (pwForm.next.length < 8) { setPwError('Password must be at least 8 characters'); return }
    setPwSaving(true)
    const res = await fetch('/api/auth/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    })
    const data = await res.json()
    if (!res.ok) { setPwError(data.error || 'Failed to update password') }
    else { setPwSuccess(true); setPwForm({ current: '', next: '', confirm: '' }) }
    setPwSaving(false)
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileSaving(true)
    await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: profileForm.name }),
    })
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
    setProfileSaving(false)
  }

  function closeInviteDialog() {
    setInviteOpen(false)
    setInviteResult(null)
    setInviteError('')
  }

  if (!session) return null

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-500 mt-0.5">{t('settings.subtitle')}</p>
      </div>

      <div className="space-y-6">
        {/* Organization */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-[#1e3a5f]" />
              </div>
              <div>
                <CardTitle className="text-base">Organization</CardTitle>
                <CardDescription>Your company workspace details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Name</p>
                <p className="text-sm font-medium text-gray-900">{session.user.organizationName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Members</p>
                <p className="text-sm font-medium text-gray-900">{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#1e3a5f]" />
                </div>
                <div>
                  <CardTitle className="text-base">Team Members</CardTitle>
                  <CardDescription>Users with access to this workspace</CardDescription>
                </div>
              </div>
              {isAdmin && (
                <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) closeInviteDialog(); else setInviteOpen(true) }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#2a4f7c] gap-2">
                      <Plus className="w-3.5 h-3.5" /> Invite Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Add a new member to your workspace. A temporary password will be generated for them to log in.
                      </DialogDescription>
                    </DialogHeader>

                    {inviteResult ? (
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          <p className="text-sm font-medium">{inviteResult.email} has been added</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">Share these credentials with the new member:</p>
                          <div className="bg-gray-50 rounded-lg p-4 space-y-2 font-mono text-sm">
                            <p><span className="text-gray-400">Email:</span> {inviteResult.email}</p>
                            <div className="flex items-center justify-between">
                              <p><span className="text-gray-400">Password:</span> {inviteResult.tempPassword}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1.5 text-xs"
                                onClick={() => copyPassword(inviteResult.tempPassword)}
                              >
                                {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Copied' : 'Copy'}
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400">Ask them to change their password after first login.</p>
                        </div>
                        <Button className="w-full" variant="outline" onClick={closeInviteDialog}>Done</Button>
                      </div>
                    ) : (
                      <form onSubmit={handleInvite} className="space-y-4 pt-2">
                        {inviteError && (
                          <Alert variant="destructive">
                            <AlertDescription>{inviteError}</AlertDescription>
                          </Alert>
                        )}
                        <div className="space-y-2">
                          <Label>Full Name</Label>
                          <Input
                            placeholder="Jane Smith"
                            value={inviteForm.name}
                            onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email Address</Label>
                          <Input
                            type="email"
                            placeholder="jane@company.com"
                            value={inviteForm.email}
                            onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select
                            value={inviteForm.role}
                            onValueChange={(v) => setInviteForm((f) => ({ ...f, role: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin — full access</SelectItem>
                              <SelectItem value="MIGRATOR">Migrator — create & run migrations</SelectItem>
                              <SelectItem value="VIEWER">Viewer — read only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button type="button" variant="outline" className="flex-1" onClick={closeInviteDialog}>
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1 bg-[#1e3a5f] hover:bg-[#2a4f7c]" disabled={inviting}>
                            {inviting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Inviting…</> : 'Invite Member'}
                          </Button>
                        </div>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-4 text-center text-sm text-gray-400">Loading members…</div>
            ) : (
              <div className="divide-y">
                {members.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <RoleBadge role={u.role} />
                      {isAdmin && u.id !== session.user.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-500"
                          onClick={() => handleRemove(u.id)}
                          disabled={removingId === u.id}
                        >
                          {removingId === u.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-[#1e3a5f]" />
              </div>
              <div>
                <CardTitle className="text-base">Change Password</CardTitle>
                <CardDescription>Update your login password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-3 max-w-sm">
              {pwError && (
                <Alert variant="destructive"><AlertDescription>{pwError}</AlertDescription></Alert>
              )}
              {pwSuccess && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4 shrink-0" /> Password updated successfully
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Current Password</Label>
                <Input type="password" value={pwForm.current} onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input type="password" value={pwForm.next} onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} required />
              </div>
              <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2a4f7c]" disabled={pwSaving}>
                {pwSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <User className="w-4 h-4 text-[#1e3a5f]" />
              </div>
              <div>
                <CardTitle className="text-base">Profile</CardTitle>
                <CardDescription>Update your display name</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSave} className="flex gap-3 max-w-sm items-end">
              <div className="flex-1 space-y-1.5">
                <Label>Display Name</Label>
                <Input value={profileForm.name} onChange={(e) => setProfileForm({ name: e.target.value })} required />
              </div>
              <Button type="submit" variant="outline" disabled={profileSaving} className="shrink-0">
                {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : profileSaved ? <CheckCircle className="w-4 h-4 text-green-500" /> : 'Save'}
              </Button>
            </form>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</p>
                <p className="text-gray-700">{session.user.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Role</p>
                <RoleBadge role={session.user.role} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Bell className="w-4 h-4 text-[#1e3a5f]" />
              </div>
              <div>
                <CardTitle className="text-base">Email Notifications</CardTitle>
                <CardDescription>Choose which emails you receive</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'runComplete' as const, label: 'Migration run complete', desc: 'Receive an email when a simulation or migration run finishes' },
              { key: 'memberInvited' as const, label: 'New member invited', desc: 'Notify me when a new team member is added to the workspace' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <Switch
                  checked={notifPrefs[key]}
                  onCheckedChange={(v) => setNotifPrefs((p) => ({ ...p, [key]: v }))}
                />
              </div>
            ))}
            <p className="text-xs text-gray-400 pt-2 border-t">
              Notification preferences are stored locally in your browser for this session.
            </p>
          </CardContent>
        </Card>

        {/* Language (Phase 4 — i18n) */}
        <LanguageCard />

        {/* Branding (Phase 4 — white-label) */}
        <BrandingCard isAdmin={isAdmin} />

        {/* API keys (Phase 4 — programmatic access) */}
        <ApiKeysCard isAdmin={isAdmin} />
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    ADMIN: 'bg-[#1e3a5f] text-white',
    MIGRATOR: 'bg-blue-100 text-blue-700',
    VIEWER: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  )
}
