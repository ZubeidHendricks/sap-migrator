'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, Database, Download, Loader2, CheckCircle, XCircle,
  CloudUpload, Play, Info, Server,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ProjectObject { id: string; objectKey: string; objectName: string; category: string }

interface ExtractJob {
  id: string
  name: string
  targetType: string
  status: string
  rowsExtracted: number
  errorMessage: string | null
  createdAt: string
  completedAt: string | null
  objectKeys: string[]
}

const TARGET_TYPES = [
  { value: 'CSV_DOWNLOAD', label: 'CSV Download', desc: 'Extract data as a CSV file to download directly', icon: Download },
  { value: 'POSTGRESQL', label: 'PostgreSQL', desc: 'Write extracted data into a PostgreSQL database', icon: Database },
  { value: 'SNOWFLAKE', label: 'Snowflake', desc: 'Load data into your Snowflake data warehouse', icon: CloudUpload },
  { value: 'BIGQUERY', label: 'BigQuery', desc: 'Stream data into Google BigQuery', icon: CloudUpload },
]

const CONFIG_FIELDS: Record<string, { key: string; label: string; placeholder: string; secret?: boolean }[]> = {
  POSTGRESQL: [
    { key: 'host', label: 'Host', placeholder: 'db.example.com' },
    { key: 'port', label: 'Port', placeholder: '5432' },
    { key: 'database', label: 'Database', placeholder: 'mydb' },
    { key: 'username', label: 'Username', placeholder: 'postgres' },
    { key: 'password', label: 'Password', placeholder: '••••••••', secret: true },
    { key: 'schema', label: 'Schema (optional)', placeholder: 'public' },
  ],
  SNOWFLAKE: [
    { key: 'account', label: 'Account Identifier', placeholder: 'xyz12345.us-east-1' },
    { key: 'warehouse', label: 'Warehouse', placeholder: 'COMPUTE_WH' },
    { key: 'database', label: 'Database', placeholder: 'SAP_DATA' },
    { key: 'schema', label: 'Schema', placeholder: 'PUBLIC' },
    { key: 'username', label: 'Username', placeholder: 'svc_user' },
    { key: 'password', label: 'Password', placeholder: '••••••••', secret: true },
  ],
  BIGQUERY: [
    { key: 'projectId', label: 'GCP Project ID', placeholder: 'my-gcp-project' },
    { key: 'dataset', label: 'Dataset', placeholder: 'sap_extract' },
    { key: 'serviceAccountKey', label: 'Service Account Key (JSON)', placeholder: '{"type":"service_account",...}', secret: true },
  ],
  CSV_DOWNLOAD: [],
}

export default function ExtractPage() {
  const params = useParams<{ id: string }>()
  const [objects, setObjects] = useState<ProjectObject[]>([])
  const [jobs, setJobs] = useState<ExtractJob[]>([])
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState('')

  const [jobName, setJobName] = useState('')
  const [targetType, setTargetType] = useState('CSV_DOWNLOAD')
  const [config, setConfig] = useState<Record<string, string>>({})
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  const fetchJobs = useCallback(async () => {
    const res = await fetch(`/api/projects/${params.id}/extract`)
    if (res.ok) setJobs(await res.json())
  }, [params.id])

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${params.id}/objects`).then((r) => r.json()),
      fetch(`/api/projects/${params.id}/extract`).then((r) => r.json()),
    ]).then(([objs, j]) => {
      setObjects(objs)
      setJobs(j)
      setSelectedKeys(new Set(objs.map((o: ProjectObject) => o.objectKey)))
    }).finally(() => setLoading(false))
  }, [params.id])

  // Poll while a job is running
  useEffect(() => {
    if (!jobs.some((j) => j.status === 'RUNNING' || j.status === 'PENDING')) return
    const t = setInterval(fetchJobs, 2000)
    return () => clearInterval(t)
  }, [jobs, fetchJobs])

  async function launchJob() {
    setError('')
    if (!jobName.trim()) { setError('Job name is required'); return }
    if (selectedKeys.size === 0) { setError('Select at least one object to extract'); return }
    setLaunching(true)
    const res = await fetch(`/api/projects/${params.id}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: jobName.trim(),
        targetType,
        targetConfig: config,
        objectKeys: Array.from(selectedKeys),
      }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed to start job') }
    else {
      const job = await res.json()
      setJobs((prev) => [job, ...prev])
      setJobName('')
    }
    setLaunching(false)
  }

  function toggleKey(key: string) {
    setSelectedKeys((s) => {
      const n = new Set(s)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  }

  const configFields = CONFIG_FIELDS[targetType] ?? []

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/projects/${params.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Extract</h1>
          <p className="text-gray-500 text-sm">Extract data FROM your SAP system into external databases or files</p>
        </div>
      </div>

      <Alert className="mb-6 border-blue-100 bg-blue-50">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <AlertDescription className="text-blue-800 text-sm">
          Data Extract reads data from your connected SAP system via RFC/BAPI and loads it into your chosen target.
          This is the reverse of migration — useful for reporting, analytics, and data warehouse loading.
          Requires a configured <Link href={`/projects/${params.id}/connection`} className="underline font-medium">SAP Connection</Link>.
        </AlertDescription>
      </Alert>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Configuration */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New Extract Job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

              <div className="space-y-2">
                <Label>Job Name</Label>
                <Input placeholder="e.g. Monthly G/L Extract" value={jobName} onChange={(e) => setJobName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Target Destination</Label>
                <div className="grid grid-cols-2 gap-2">
                  {TARGET_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => { setTargetType(t.value); setConfig({}) }}
                      className={`flex items-start gap-2 p-3 rounded-lg border-2 text-left transition-all ${targetType === t.value ? 'border-[#1e3a5f] bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <t.icon className={`w-4 h-4 mt-0.5 shrink-0 ${targetType === t.value ? 'text-[#1e3a5f]' : 'text-gray-400'}`} />
                      <div>
                        <p className={`text-xs font-semibold ${targetType === t.value ? 'text-[#1e3a5f]' : 'text-gray-700'}`}>{t.label}</p>
                        <p className="text-xs text-gray-400 leading-tight mt-0.5">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {configFields.length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5" /> {TARGET_TYPES.find((t) => t.value === targetType)?.label} Connection
                  </p>
                  {configFields.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label className="text-xs">{f.label}</Label>
                      <Input
                        type={f.secret ? 'password' : 'text'}
                        placeholder={f.placeholder}
                        value={config[f.key] ?? ''}
                        onChange={(e) => setConfig((c) => ({ ...c, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Objects to Extract</Label>
                {loading ? <Skeleton className="h-24 w-full" /> : (
                  <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                    {objects.map((o) => (
                      <label key={o.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(o.objectKey)}
                          onChange={() => toggleKey(o.objectKey)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-900">{o.objectName}</span>
                        <span className="text-xs text-gray-400 ml-auto">{o.category}</span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400">{selectedKeys.size} of {objects.length} objects selected</p>
              </div>

              <Button onClick={launchJob} disabled={launching} className="w-full bg-[#1e3a5f] hover:bg-[#2a4f7c] gap-2">
                {launching ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting…</> : <><Play className="w-4 h-4" /> Run Extract Job</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Job history */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Extract History</h2>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Download className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No extract jobs yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <Card key={job.id} className={job.status === 'FAILED' ? 'border-red-100' : job.status === 'COMPLETED' ? 'border-green-100' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm text-gray-900 truncate">{job.name}</p>
                          <JobStatusBadge status={job.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="font-medium text-gray-600">{TARGET_TYPES.find((t) => t.value === job.targetType)?.label ?? job.targetType}</span>
                          <span>·</span>
                          <span>{(job.objectKeys as string[]).length} objects</span>
                          {job.status === 'COMPLETED' && <span>· <strong className="text-green-700">{job.rowsExtracted.toLocaleString()} rows</strong></span>}
                        </div>
                        {job.status === 'FAILED' && job.errorMessage && (
                          <p className="text-xs text-red-600 mt-1">{job.errorMessage}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {(job.status === 'RUNNING' || job.status === 'PENDING') && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                        {job.status === 'COMPLETED' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {job.status === 'FAILED' && <XCircle className="w-4 h-4 text-red-500" />}
                        <p className="text-xs text-gray-400 mt-1">{formatDate(job.createdAt)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function JobStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'info' }> = {
    PENDING:   { label: 'Pending',   variant: 'secondary' },
    RUNNING:   { label: 'Running',   variant: 'info' },
    COMPLETED: { label: 'Completed', variant: 'success' },
    FAILED:    { label: 'Failed',    variant: 'default' },
  }
  const s = map[status] ?? { label: status, variant: 'secondary' }
  return <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
}
