'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, FolderKanban, Play, Users, Upload, Settings, KeyRound, Server, ArrowDownCircle, Boxes, CheckCircle, XCircle } from 'lucide-react'

interface Log {
  id: string
  action: string
  entityType: string | null
  entityName: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user: { name: string | null; email: string }
}

const ACTION_META: Record<string, { label: string; icon: typeof Activity; color: string }> = {
  'project.created':      { label: 'Created project',        icon: FolderKanban, color: 'text-blue-500' },
  'project.updated':      { label: 'Updated project',        icon: FolderKanban, color: 'text-yellow-500' },
  'project.deleted':      { label: 'Deleted project',        icon: FolderKanban, color: 'text-red-500' },
  'object.status_changed':{ label: 'Changed object status',  icon: Settings,     color: 'text-purple-500' },
  'run.completed':        { label: 'Run completed',          icon: Play,         color: 'text-green-500' },
  'member.invited':       { label: 'Invited member',         icon: Users,        color: 'text-blue-500' },
  'member.removed':       { label: 'Removed member',         icon: Users,        color: 'text-red-500' },
  'template.uploaded':    { label: 'Uploaded template',      icon: Upload,       color: 'text-green-500' },
  'connection.saved':     { label: 'Updated SAP connection', icon: Server,       color: 'text-blue-500' },
  'password.changed':     { label: 'Changed password',       icon: KeyRound,          color: 'text-gray-500' },
  'project.cloned':       { label: 'Cloned project',         icon: FolderKanban,      color: 'text-blue-500' },
  'extract.created':      { label: 'Started data extract',   icon: ArrowDownCircle,   color: 'text-indigo-500' },
  'apikey.created':       { label: 'Created API key',        icon: KeyRound,          color: 'text-blue-500' },
  'apikey.revoked':       { label: 'Revoked API key',        icon: KeyRound,          color: 'text-red-500' },
  'custom_object.created':{ label: 'Created custom object',   icon: Boxes,             color: 'text-blue-500' },
  'custom_object.deleted':{ label: 'Deleted custom object',   icon: Boxes,             color: 'text-red-500' },
  'object.restrictions_changed': { label: 'Changed field access', icon: Settings,       color: 'text-purple-500' },
  'branding.updated':     { label: 'Updated branding',        icon: Settings,          color: 'text-blue-500' },
  'object.assigned':      { label: 'Assigned an object',      icon: Users,             color: 'text-blue-500' },
  'run.submitted':        { label: 'Submitted run for approval', icon: Play,           color: 'text-yellow-500' },
  'run.approved':         { label: 'Approved a run',          icon: CheckCircle,       color: 'text-green-500' },
  'run.rejected':         { label: 'Rejected a run',          icon: XCircle,           color: 'text-red-500' },
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/audit?limit=100')
      .then((r) => r.json())
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
        <p className="text-gray-500 mt-0.5">Everything that has happened in your workspace</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No activity yet</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-100" />
              <div className="space-y-1">
                {logs.map((log) => {
                  const meta = ACTION_META[log.action] ?? { label: log.action, icon: Activity, color: 'text-gray-400' }
                  const Icon = meta.icon
                  return (
                    <div key={log.id} className="flex gap-4 py-3 pl-2">
                      <div className={`w-6 h-6 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center shrink-0 z-10 ${meta.color}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{log.user.name ?? log.user.email}</span>
                          {' '}{meta.label}
                          {log.entityName && (
                            <span className="text-gray-500"> — <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{log.entityName}</span></span>
                          )}
                        </p>
                        {log.action === 'object.status_changed' && log.metadata && !!(log.metadata as Record<string, unknown>).status && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Status set to <Badge variant="outline" className="text-xs py-0 ml-1">{String((log.metadata as Record<string, unknown>).status)}</Badge>
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 pt-0.5">{formatTime(log.createdAt)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
