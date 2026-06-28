'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft, Download, Upload, FileSpreadsheet, Info, CheckCircle,
  FileCheck, Loader2, AlertTriangle, MessageSquare, Send,
} from 'lucide-react'

interface ProjectObject {
  id: string
  objectKey: string
  objectName: string
  category: string
  status: string
  assignedToId?: string | null
}

interface Member { id: string; name: string | null; email: string }
interface CommentItem { id: string; body: string; createdAt: string; author: { id: string; name: string | null; email: string } }

interface ValidationIssue {
  row: number
  field: string
  severity: 'ERROR' | 'WARNING'
  message: string
}

interface ValidationErrors {
  totalRows: number
  validRows: number
  errorRows: number
  warningRows: number
  issues: ValidationIssue[]
}

interface UploadedTemplate {
  id: string
  filename: string
  fileSize: number
  rowCount: number | null
  status: string
  createdAt: string
  validationErrors?: ValidationErrors | null
}

const CATEGORY_COLORS: Record<string, string> = {
  Finance: 'bg-blue-100 text-blue-700',
  Controlling: 'bg-purple-100 text-purple-700',
  'Master Data': 'bg-green-100 text-green-700',
  Logistics: 'bg-orange-100 text-orange-700',
  Inventory: 'bg-yellow-100 text-yellow-700',
  'Human Resources': 'bg-pink-100 text-pink-700',
  Basis: 'bg-gray-100 text-gray-600',
}

export default function TemplatesPage() {
  const params = useParams<{ id: string }>()
  const [objects, setObjects] = useState<ProjectObject[]>([])
  const [uploads, setUploads] = useState<Record<string, UploadedTemplate[]>>({})
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<Record<string, string>>({})
  const [markingDone, setMarkingDone] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [commentsFor, setCommentsFor] = useState<ProjectObject | null>(null)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${params.id}/objects`).then((r) => r.json()),
      fetch(`/api/projects/${params.id}/upload`).then((r) => r.json()),
      fetch(`/api/organizations/members`).then((r) => r.json()),
    ]).then(([objs, templates, mem]: [ProjectObject[], (UploadedTemplate & { projectObject: { objectKey: string } })[], Member[]] ) => {
      setObjects(objs)
      const byKey: Record<string, UploadedTemplate[]> = {}
      for (const t of templates) {
        const key = t.projectObject.objectKey
        if (!byKey[key]) byKey[key] = []
        byKey[key].push(t)
      }
      setUploads(byKey)
      if (Array.isArray(mem)) setMembers(mem)
    }).finally(() => setLoading(false))
  }, [params.id])

  async function assignObject(objectId: string, assignedToId: string) {
    const res = await fetch(`/api/projects/${params.id}/objects/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objectId, assignedToId: assignedToId || null }),
    })
    if (res.ok) setObjects((os) => os.map((o) => o.id === objectId ? { ...o, assignedToId: assignedToId || null } : o))
  }

  async function openComments(obj: ProjectObject) {
    setCommentsFor(obj); setComments([]); setCommentBody('')
    const res = await fetch(`/api/projects/${params.id}/objects/comments?objectId=${obj.id}`)
    if (res.ok) setComments(await res.json())
  }

  async function postComment() {
    if (!commentsFor || !commentBody.trim()) return
    setPostingComment(true)
    const res = await fetch(`/api/projects/${params.id}/objects/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objectId: commentsFor.id, body: commentBody }),
    })
    if (res.ok) { const c = await res.json(); setComments((cs) => [...cs, c]); setCommentBody('') }
    setPostingComment(false)
  }

  async function downloadTemplate(objectKey: string) {
    setDownloading(objectKey)
    try {
      const res = await fetch(`/api/projects/${params.id}/template?objectKey=${objectKey}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Source_data_for_${objectKey}.xml`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(null)
    }
  }

  async function downloadAll() {
    for (const obj of objects) {
      await downloadTemplate(obj.objectKey)
      await new Promise((r) => setTimeout(r, 300))
    }
  }

  async function handleFileUpload(objectKey: string, file: File) {
    if (!file.name.endsWith('.xml')) {
      setUploadError((e) => ({ ...e, [objectKey]: 'Only .xml files are accepted' }))
      return
    }
    setUploading(objectKey)
    setUploadError((e) => ({ ...e, [objectKey]: '' }))

    const fd = new FormData()
    fd.append('file', file)
    fd.append('objectKey', objectKey)

    const res = await fetch(`/api/projects/${params.id}/upload`, { method: 'POST', body: fd })
    const data = await res.json()

    if (!res.ok) {
      setUploadError((e) => ({ ...e, [objectKey]: data.error || 'Upload failed' }))
    } else {
      setUploads((u) => ({ ...u, [objectKey]: [data, ...(u[objectKey] ?? [])] }))
      const ok = (data.validationErrors?.errorRows ?? 0) === 0
      if (ok) {
        setObjects((os) => os.map((o) => o.objectKey === objectKey ? { ...o, status: 'READY' } : o))
      }
    }
    setUploading(null)
  }

  async function markAsDone(objectId: string, objectKey: string) {
    setMarkingDone(objectKey)
    const res = await fetch(`/api/projects/${params.id}/objects/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objectId, status: 'DONE' }),
    })
    if (res.ok) {
      setObjects((os) => os.map((o) => o.id === objectId ? { ...o, status: 'DONE' } : o))
    }
    setMarkingDone(null)
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/projects/${params.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500 text-sm">Download XML templates, fill with your data, then upload them back</p>
        </div>
        {objects.length > 0 && (
          <Button variant="outline" className="gap-2" onClick={downloadAll}>
            <Download className="w-4 h-4" /> Download All
          </Button>
        )}
      </div>

      <Alert className="mb-6 border-blue-100 bg-blue-50">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          Templates are in <strong>MS Excel XML Spreadsheet 2003</strong> format — the only format accepted by the SAP S/4HANA Migration Cockpit.
          Row 1 = field labels, Row 2 = technical names, Rows 3+ = your data.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-3 w-1/2" /></CardContent></Card>
          ))}
        </div>
      ) : objects.length === 0 ? (
        <div className="text-center py-16">
          <FileSpreadsheet className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No migration objects selected yet</p>
          <Link href={`/projects/${params.id}/objects`}>
            <Button className="bg-[#1e3a5f] hover:bg-[#2a4f7c]">Select Objects First</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {objects.map((obj) => {
              const objectUploads = uploads[obj.objectKey] ?? []
              const latestUpload = objectUploads[0]
              const isReady = obj.status === 'READY' || obj.status === 'DONE'

              return (
                <Card key={obj.id} className={`transition-shadow hover:shadow-sm ${isReady ? 'border-green-200' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isReady ? 'bg-green-50' : 'bg-blue-50'}`}>
                          {isReady
                            ? <FileCheck className="w-4 h-4 text-green-600" />
                            : <FileSpreadsheet className="w-4 h-4 text-[#1e3a5f]" />}
                        </div>
                        {isReady && (
                          <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Uploaded
                          </span>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[obj.category] ?? 'bg-gray-100 text-gray-600'}`}>
                        {obj.category}
                      </span>
                    </div>
                    <CardTitle className="text-sm mt-2">{obj.objectName}</CardTitle>
                    <CardDescription className="text-xs font-mono">{`Source_data_for_${obj.objectKey}.xml`}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Collaboration: owner + comments */}
                    <div className="flex items-center gap-2">
                      <select
                        value={obj.assignedToId ?? ''}
                        onChange={(e) => assignObject(obj.id, e.target.value)}
                        className="flex-1 h-8 rounded-md border border-gray-200 text-xs px-2 text-gray-700 bg-white"
                        title="Assign owner"
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => openComments(obj)}
                        className="h-8 px-2.5 rounded-md border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 shrink-0"
                        title="Comments"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Discuss
                      </button>
                    </div>

                    {/* Latest upload info + validation summary */}
                    {latestUpload && (() => {
                      const v = latestUpload.validationErrors
                      const hasErrors = (v?.errorRows ?? 0) > 0
                      const hasWarnings = (v?.warningRows ?? 0) > 0
                      const tone = hasErrors
                        ? 'bg-red-50 text-red-800'
                        : hasWarnings
                          ? 'bg-yellow-50 text-yellow-800'
                          : 'bg-green-50 text-green-800'
                      return (
                        <div className={`rounded-lg p-3 text-xs space-y-1 ${tone}`}>
                          <p className="font-medium flex items-center gap-1.5">
                            {hasErrors ? <AlertTriangle className="w-3 h-3" /> : <FileCheck className="w-3 h-3" />}
                            {latestUpload.filename}
                          </p>
                          <p className="opacity-80">
                            {latestUpload.rowCount != null ? `${latestUpload.rowCount} data rows` : 'Uploaded'} · {formatBytes(latestUpload.fileSize)}
                          </p>
                          {v && (
                            <div className="flex items-center gap-3 pt-1 font-medium">
                              <span className="text-green-700">{v.validRows} valid</span>
                              {v.errorRows > 0 && <span className="text-red-600">{v.errorRows} errors</span>}
                              {v.warningRows > 0 && <span className="text-yellow-700">{v.warningRows} warnings</span>}
                            </div>
                          )}
                          {v && v.issues.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5 border-t border-current/10 pt-1.5">
                              {v.issues.slice(0, 5).map((iss, i) => (
                                <li key={i} className="flex gap-1.5 leading-snug">
                                  <span className="opacity-50 shrink-0">row {iss.row}</span>
                                  <span>{iss.message}</span>
                                </li>
                              ))}
                              {v.issues.length > 5 && (
                                <li className="opacity-60">+{v.issues.length - 5} more issue{v.issues.length - 5 !== 1 ? 's' : ''}…</li>
                              )}
                            </ul>
                          )}
                          {hasErrors && (
                            <p className="pt-1 opacity-80">Fix these rows and re-upload before running a migration.</p>
                          )}
                        </div>
                      )
                    })()}

                    {uploadError[obj.objectKey] && (
                      <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 p-2 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        {uploadError[obj.objectKey]}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => downloadTemplate(obj.objectKey)}
                        disabled={downloading === obj.objectKey}
                      >
                        {downloading === obj.objectKey
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />}
                        {latestUpload ? 'Re-download' : 'Download'}
                      </Button>

                      <input
                        type="file"
                        accept=".xml"
                        className="hidden"
                        ref={(el) => { fileInputRefs.current[obj.objectKey] = el }}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleFileUpload(obj.objectKey, f)
                          e.target.value = ''
                        }}
                      />
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 bg-[#1e3a5f] hover:bg-[#2a4f7c]"
                        onClick={() => fileInputRefs.current[obj.objectKey]?.click()}
                        disabled={uploading === obj.objectKey}
                      >
                        {uploading === obj.objectKey
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Upload className="w-3.5 h-3.5" />}
                        {uploading === obj.objectKey ? 'Uploading…' : latestUpload ? 'Re-upload' : 'Upload Filled'}
                      </Button>
                    </div>

                    {/* Mark as done */}
                    {latestUpload && obj.status !== 'DONE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5 border-green-200 text-green-700 hover:bg-green-50"
                        onClick={() => markAsDone(obj.id, obj.objectKey)}
                        disabled={markingDone === obj.objectKey}
                      >
                        {markingDone === obj.objectKey
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <CheckCircle className="w-3.5 h-3.5" />}
                        Mark as Done
                      </Button>
                    )}
                    {obj.status === 'DONE' && (
                      <p className="text-xs text-green-600 text-center font-medium flex items-center justify-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Marked as Done
                      </p>
                    )}

                    {/* Upload history count */}
                    {objectUploads.length > 1 && (
                      <p className="text-xs text-gray-400 text-center">
                        {objectUploads.length} versions uploaded
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Usage guide */}
          <Card className="mt-8 border-gray-100">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#1e3a5f]" />
                How to use these templates
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filling the template</p>
                  <ol className="text-sm text-gray-600 space-y-2">
                    {[
                      'Download the XML template for each object',
                      'Open in Microsoft Excel — do NOT convert to .xlsx',
                      'Fill your data from Row 3 downward',
                      'Paste as Values Only (Ctrl+Shift+V)',
                      'NUMC fields need leading zeros (0000100000)',
                      'Dates must be YYYY-MM-DD format',
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-[#1e3a5f] text-white text-xs flex items-center justify-center shrink-0 mt-0.5 text-[10px]">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Uploading to SAP</p>
                  <ol className="text-sm text-gray-600 space-y-2">
                    {[
                      'Upload the filled XML file above to track it here',
                      'Open SAP Migration Cockpit (Fiori: "Migrate Your Data")',
                      'Select your migration project and object',
                      'Choose "Upload File" and select the XML',
                      'Run a Simulation first to validate records',
                      'Fix errors via correction file, then run Migration',
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-green-600 text-white text-xs flex items-center justify-center shrink-0 mt-0.5 text-[10px]">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Comments dialog */}
      <Dialog open={!!commentsFor} onOpenChange={(o) => !o && setCommentsFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#1e3a5f]" /> {commentsFor?.objectName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {comments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No comments yet. Start the discussion.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-50 text-[#1e3a5f] text-xs font-semibold flex items-center justify-center shrink-0">
                      {(c.author.name ?? c.author.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{c.author.name ?? c.author.email}</span>
                        {' · '}{new Date(c.createdAt).toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{c.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-end gap-2 border-t pt-3">
              <Textarea
                rows={2}
                placeholder="Write a comment…"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment() }}
                className="flex-1 resize-none"
              />
              <Button onClick={postComment} disabled={postingComment || !commentBody.trim()} className="bg-[#1e3a5f] hover:bg-[#2a4f7c] shrink-0">
                {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
