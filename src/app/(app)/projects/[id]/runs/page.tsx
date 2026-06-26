'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Play, TestTube, CheckCircle, XCircle, AlertTriangle,
  Loader2, Download, RefreshCw, Clock, GitCompareArrows,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface RunRecord {
  id: string; recordKey: string; status: 'SUCCESS' | 'ERROR' | 'WARNING'; message?: string
  projectObject: { objectName: string; objectKey: string }
}

interface Run {
  id: string; type: 'SIMULATION' | 'MIGRATION'; status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  totalRecords: number; successCount: number; errorCount: number; warningCount: number
  startedAt?: string; completedAt?: string; createdAt: string; records: RunRecord[]
}

export default function RunsPage() {
  const params = useParams<{ id: string }>()
  const { toast } = useToast()
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [selectedRun, setSelectedRun] = useState<Run | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [compareMode, setCompareMode] = useState(false)
  const [compareA, setCompareA] = useState<Run | null>(null)
  const [compareB, setCompareB] = useState<Run | null>(null)

  const fetchRuns = useCallback(async () => {
    const res = await fetch(`/api/projects/${params.id}/runs`)
    const data = await res.json()
    setRuns(data)
    if (selectedRun) {
      const updated = data.find((r: Run) => r.id === selectedRun.id)
      if (updated) setSelectedRun(updated)
    }
  }, [params.id, selectedRun])

  useEffect(() => {
    fetchRuns().finally(() => setLoading(false))
  }, [])

  // Poll while any run is RUNNING
  useEffect(() => {
    const hasRunning = runs.some((r) => r.status === 'RUNNING' || r.status === 'PENDING')
    if (!hasRunning) return
    const t = setInterval(fetchRuns, 2000)
    return () => clearInterval(t)
  }, [runs, fetchRuns])

  async function launchRun(type: 'SIMULATION' | 'MIGRATION') {
    setLaunching(true)
    const res = await fetch(`/api/projects/${params.id}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    if (res.ok) {
      const run = await res.json()
      setRuns((prev) => [run, ...prev])
      setSelectedRun(run)
      toast({ title: `${type === 'SIMULATION' ? 'Simulation' : 'Migration'} started`, description: 'Processing records…' })
    }
    setLaunching(false)
  }

  function downloadErrors(run: Run) {
    const errors = run.records.filter((r) => r.status === 'ERROR')
    const csv = ['Object,Record Key,Error Message', ...errors.map((e) =>
      `"${e.projectObject.objectName}","${e.recordKey}","${e.message ?? ''}"`
    )].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `correction_file_${run.id.slice(-6)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const pct = (run: Run) => run.totalRecords > 0 ? Math.round((run.successCount / run.totalRecords) * 100) : 0

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/projects/${params.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Run Center</h1>
          <p className="text-gray-500 text-sm">Simulate to validate, then execute your migration</p>
        </div>
        <div className="flex items-center gap-2">
          {runs.filter((r) => r.status === 'COMPLETED').length >= 2 && (
            <Button
              variant={compareMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setCompareMode((c) => !c); setCompareA(null); setCompareB(null) }}
              className={compareMode ? 'bg-[#1e3a5f]' : ''}
            >
              <GitCompareArrows className="w-4 h-4 mr-1.5" /> Compare
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={fetchRuns} className="h-9 w-9">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Launch buttons */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Card className="border-blue-100 hover:shadow-sm transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <TestTube className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Simulation Run</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Validate all records without committing data to SAP. Identifies errors before the real migration.
                  Equivalent to the TESTRUN API parameter.
                </p>
                <Button
                  onClick={() => launchRun('SIMULATION')}
                  disabled={launching}
                  variant="outline"
                  className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                  Run Simulation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-100 hover:shadow-sm transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <Play className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Migration Run</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Execute the real migration. Records are committed to SAP S/4HANA. Run a simulation first
                  to ensure data quality before executing.
                </p>
                <Button
                  onClick={() => launchRun('MIGRATION')}
                  disabled={launching}
                  className="gap-2 bg-[#1e3a5f] hover:bg-[#2a4f7c]"
                >
                  {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Run Migration
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compare panel */}
      {compareMode && (
        <Card className="mb-8 border-[#1e3a5f]/20 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-sm text-[#1e3a5f] flex items-center gap-2">
              <GitCompareArrows className="w-4 h-4" /> Run Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-4">Select two completed runs to compare results side by side.</p>
            <div className="grid grid-cols-2 gap-4">
              {[{ label: 'Run A', val: compareA, set: setCompareA }, { label: 'Run B', val: compareB, set: setCompareB }].map(({ label, val, set }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
                  <div className="space-y-1.5">
                    {runs.filter((r) => r.status === 'COMPLETED').map((r) => (
                      <button key={r.id} onClick={() => set(r)} className={`w-full text-left px-3 py-2 rounded border text-xs transition-colors ${val?.id === r.id ? 'border-[#1e3a5f] bg-white font-medium' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        <span className="text-gray-700">{r.type === 'SIMULATION' ? 'Sim' : 'Mig'}</span>
                        <span className="text-gray-400 ml-2">{formatDate(r.createdAt)}</span>
                        <span className="ml-2 text-green-600">{r.successCount}✓</span>
                        {r.errorCount > 0 && <span className="ml-1 text-red-500">{r.errorCount}✗</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {compareA && compareB && (
              <div className="mt-6 grid grid-cols-2 gap-4">
                {[compareA, compareB].map((r, i) => (
                  <div key={r.id} className="bg-white rounded-lg border p-4">
                    <p className="text-xs font-bold text-gray-500 mb-3">{i === 0 ? 'Run A' : 'Run B'} — {r.type === 'SIMULATION' ? 'Simulation' : 'Migration'}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-green-50 rounded p-2"><p className="text-lg font-bold text-green-700">{r.successCount}</p><p className="text-xs text-green-600">Success</p></div>
                      <div className="bg-red-50 rounded p-2"><p className="text-lg font-bold text-red-700">{r.errorCount}</p><p className="text-xs text-red-600">Errors</p></div>
                      <div className="bg-yellow-50 rounded p-2"><p className="text-lg font-bold text-yellow-700">{r.warningCount}</p><p className="text-xs text-yellow-600">Warnings</p></div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Success rate</span><span>{pct(r)}%</span></div>
                      <Progress value={pct(r)} className="h-1.5" />
                    </div>
                    {i === 1 && compareA && (
                      <div className="mt-3 pt-3 border-t text-xs space-y-1">
                        <p className="font-semibold text-gray-500 mb-1.5">vs Run A</p>
                        <DiffStat label="Errors" a={compareA.errorCount} b={r.errorCount} lower />
                        <DiffStat label="Warnings" a={compareA.warningCount} b={r.warningCount} lower />
                        <DiffStat label="Success rate" a={pct(compareA)} b={pct(r)} suffix="%" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Run list + detail */}
      <div className="flex gap-6">
        {/* Run list */}
        <div className="w-72 shrink-0 space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Run History</h2>
          {loading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
          ) : runs.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No runs yet. Launch a simulation above.
            </div>
          ) : (
            runs.map((run) => (
              <button
                key={run.id}
                onClick={() => setSelectedRun(run)}
                className={`w-full text-left p-3.5 rounded-lg border-2 transition-all ${
                  selectedRun?.id === run.id ? 'border-[#1e3a5f] bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {run.type === 'SIMULATION' ? (
                      <TestTube className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-green-500" />
                    )}
                    <span className="text-xs font-semibold text-gray-700">
                      {run.type === 'SIMULATION' ? 'Simulation' : 'Migration'}
                    </span>
                  </div>
                  <RunStatusBadge status={run.status} />
                </div>
                {run.status === 'RUNNING' || run.status === 'PENDING' ? (
                  <div className="flex items-center gap-1.5 text-xs text-blue-500">
                    <Loader2 className="w-3 h-3 animate-spin" /> Processing…
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-600">{run.successCount} ✓</span>
                    {run.errorCount > 0 && <span className="text-red-500">{run.errorCount} ✗</span>}
                    {run.warningCount > 0 && <span className="text-yellow-600">{run.warningCount} ⚠</span>}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">{formatDate(run.createdAt)}</p>
              </button>
            ))
          )}
        </div>

        {/* Run detail */}
        <div className="flex-1">
          {!selectedRun ? (
            <div className="text-center py-20 text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Select a run to view results</p>
            </div>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {selectedRun.type === 'SIMULATION' ? 'Simulation' : 'Migration'} Run
                  </CardTitle>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(selectedRun.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRun.errorCount > 0 && (
                    <Button size="sm" variant="outline" onClick={() => downloadErrors(selectedRun)} className="gap-1.5">
                      <Download className="w-3.5 h-3.5" /> Correction File
                    </Button>
                  )}
                  <RunStatusBadge status={selectedRun.status} />
                </div>
              </CardHeader>
              <CardContent>
                {selectedRun.status === 'RUNNING' || selectedRun.status === 'PENDING' ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1e3a5f] mb-3" />
                    <p className="text-gray-500 text-sm">Processing records…</p>
                    <p className="text-xs text-gray-400 mt-1">This page refreshes automatically</p>
                  </div>
                ) : (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-700">{selectedRun.successCount}</p>
                        <p className="text-xs text-green-600 mt-0.5">Success</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-700">{selectedRun.errorCount}</p>
                        <p className="text-xs text-red-600 mt-0.5">Errors</p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-700">{selectedRun.warningCount}</p>
                        <p className="text-xs text-yellow-600 mt-0.5">Warnings</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                        <span>Success rate</span>
                        <span>{pct(selectedRun)}% ({selectedRun.successCount}/{selectedRun.totalRecords} records)</span>
                      </div>
                      <Progress value={pct(selectedRun)} className="h-2.5" />
                    </div>

                    {selectedRun.errorCount > 0 && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription className="text-sm">
                          {selectedRun.errorCount} records failed. Download the correction file, fix the issues, and re-upload.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Record table */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="mb-4">
                        <TabsTrigger value="all">All ({selectedRun.totalRecords})</TabsTrigger>
                        <TabsTrigger value="errors">Errors ({selectedRun.errorCount})</TabsTrigger>
                        <TabsTrigger value="warnings">Warnings ({selectedRun.warningCount})</TabsTrigger>
                      </TabsList>

                      <TabsContent value="all">
                        <RecordTable records={selectedRun.records} />
                      </TabsContent>
                      <TabsContent value="errors">
                        <RecordTable records={selectedRun.records.filter((r) => r.status === 'ERROR')} />
                      </TabsContent>
                      <TabsContent value="warnings">
                        <RecordTable records={selectedRun.records.filter((r) => r.status === 'WARNING')} />
                      </TabsContent>
                    </Tabs>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function RecordTable({ records }: { records: RunRecord[] }) {
  if (records.length === 0) return (
    <div className="text-center py-8 text-gray-400 text-sm">No records in this category</div>
  )

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"></TableHead>
          <TableHead>Object</TableHead>
          <TableHead>Record Key</TableHead>
          <TableHead>Message</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.slice(0, 100).map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              {r.status === 'SUCCESS' && <CheckCircle className="w-4 h-4 text-green-500" />}
              {r.status === 'ERROR' && <XCircle className="w-4 h-4 text-red-500" />}
              {r.status === 'WARNING' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
            </TableCell>
            <TableCell className="text-sm font-medium">{r.projectObject.objectName}</TableCell>
            <TableCell className="font-mono text-xs text-gray-600">{r.recordKey}</TableCell>
            <TableCell className="text-sm text-gray-500">{r.message ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function DiffStat({ label, a, b, lower, suffix = '' }: { label: string; a: number; b: number; lower?: boolean; suffix?: string }) {
  const diff = b - a
  const better = lower ? diff < 0 : diff > 0
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={diff === 0 ? 'text-gray-400' : better ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
        {diff > 0 ? '+' : ''}{diff}{suffix}
      </span>
    </div>
  )
}

function RunStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'info' }> = {
    PENDING: { label: 'Pending', variant: 'secondary' },
    RUNNING: { label: 'Running', variant: 'info' },
    COMPLETED: { label: 'Completed', variant: 'success' },
    FAILED: { label: 'Failed', variant: 'default' },
  }
  const s = map[status] ?? { label: status, variant: 'secondary' }
  return <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
}
