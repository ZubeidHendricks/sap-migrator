'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Download, FileSpreadsheet, Info, CheckCircle, ExternalLink } from 'lucide-react'

interface ProjectObject { id: string; objectKey: string; objectName: string; category: string }

export default function TemplatesPage() {
  const params = useParams<{ id: string }>()
  const [objects, setObjects] = useState<ProjectObject[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${params.id}/objects`)
      .then((r) => r.json())
      .then(setObjects)
      .finally(() => setLoading(false))
  }, [params.id])

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

  const CATEGORY_COLORS: Record<string, string> = {
    Finance: 'info',
    Controlling: 'default',
    'Master Data': 'success',
    Logistics: 'warning',
    Inventory: 'warning',
    'Human Resources': 'secondary',
    Basis: 'secondary',
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/projects/${params.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500 text-sm">Download XML templates, fill with your data, upload to SAP Migration Cockpit</p>
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
          Row 1 = field labels, Row 2 = technical names, Rows 3+ = your data. Required fields are marked with *.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
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
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {objects.map((obj) => (
              <Card key={obj.id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4 text-[#1e3a5f]" />
                    </div>
                    <Badge variant={(CATEGORY_COLORS[obj.category] ?? 'secondary') as any} className="text-xs">
                      {obj.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm mt-2">{obj.objectName}</CardTitle>
                  <CardDescription className="text-xs font-mono">{`Source_data_for_${obj.objectKey}.xml`}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-gray-400 mb-4 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      Pre-formatted XML Spreadsheet 2003
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      Field guide worksheet included
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      3 sample rows for reference
                    </div>
                  </div>
                  <Button
                    className="w-full bg-[#1e3a5f] hover:bg-[#2a4f7c] gap-2"
                    size="sm"
                    onClick={() => downloadTemplate(obj.objectKey)}
                    disabled={downloading === obj.objectKey}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {downloading === obj.objectKey ? 'Downloading…' : 'Download Template'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-8 border-gray-100">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#1e3a5f]" />
                How to use these templates
              </h3>
              <ol className="text-sm text-gray-600 space-y-2 list-none">
                {[
                  'Download the XML template for each migration object',
                  'Open in Microsoft Excel (do NOT convert to .xlsx — keep as XML)',
                  'Fill your legacy data starting from Row 3. Keep Row 1 (labels) and Row 2 (technical names) intact',
                  'When copying from another source, paste as Values Only (Ctrl+Shift+V) to avoid formatting issues',
                  'NUMC fields must include leading zeros (e.g. 0000100000, not 100000)',
                  'Date fields must use format YYYY-MM-DD',
                  'Upload the filled XML file in the SAP Migration Cockpit under "Upload File"',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
