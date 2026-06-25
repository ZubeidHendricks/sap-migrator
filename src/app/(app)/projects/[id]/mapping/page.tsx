'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Plus, Trash2, Loader2, MapPin, ArrowRight } from 'lucide-react'
import { getObjectByKey } from '@/lib/migration-objects'
import { useToast } from '@/components/ui/use-toast'

interface ProjectObject { id: string; objectKey: string; objectName: string; category: string }
interface Mapping { id: string; fieldName: string; fieldLabel?: string; sourceValue: string; targetValue: string; projectObjectId: string }

export default function MappingPage() {
  const params = useParams<{ id: string }>()
  const { toast } = useToast()
  const [objects, setObjects] = useState<ProjectObject[]>([])
  const [selectedObj, setSelectedObj] = useState<ProjectObject | null>(null)
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [loadingObjs, setLoadingObjs] = useState(true)
  const [loadingMaps, setLoadingMaps] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ fieldName: '', sourceValue: '', targetValue: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${params.id}/objects`)
      .then((r) => r.json())
      .then((data) => {
        setObjects(data)
        if (data.length > 0) setSelectedObj(data[0])
      })
      .finally(() => setLoadingObjs(false))
  }, [params.id])

  useEffect(() => {
    if (!selectedObj) return
    setLoadingMaps(true)
    fetch(`/api/projects/${params.id}/mappings?objectId=${selectedObj.id}`)
      .then((r) => r.json())
      .then(setMappings)
      .finally(() => setLoadingMaps(false))
  }, [selectedObj, params.id])

  const objDef = selectedObj ? getObjectByKey(selectedObj.objectKey) : null

  async function addMapping() {
    if (!selectedObj || !form.fieldName || !form.sourceValue || !form.targetValue) return
    setSaving(true)
    const field = objDef?.fields.find((f) => f.name === form.fieldName)
    const res = await fetch(`/api/projects/${params.id}/mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectObjectId: selectedObj.id,
        fieldName: form.fieldName,
        fieldLabel: field?.label,
        sourceValue: form.sourceValue,
        targetValue: form.targetValue,
      }),
    })
    if (res.ok) {
      const m = await res.json()
      setMappings((prev) => [...prev, m])
      setForm({ fieldName: '', sourceValue: '', targetValue: '' })
      setDialogOpen(false)
      toast({ title: 'Mapping added', variant: 'default' })
    }
    setSaving(false)
  }

  async function deleteMapping(id: string) {
    await fetch(`/api/projects/${params.id}/mappings`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappingId: id }),
    })
    setMappings((prev) => prev.filter((m) => m.id !== id))
    toast({ title: 'Mapping removed' })
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/projects/${params.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Value Mapping</h1>
          <p className="text-gray-500 text-sm">Map source system values to SAP target values per field</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Object list */}
        <div className="w-64 shrink-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-500 uppercase tracking-wide">Objects</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {loadingObjs ? (
                <div className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin mx-auto text-gray-300" /></div>
              ) : objects.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-400">
                  No objects selected.{' '}
                  <Link href={`/projects/${params.id}/objects`} className="text-[#1e3a5f] hover:underline">Add objects</Link>
                </div>
              ) : (
                objects.map((obj) => (
                  <button
                    key={obj.id}
                    onClick={() => setSelectedObj(obj)}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                      selectedObj?.id === obj.id ? 'bg-blue-50 text-[#1e3a5f] font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {obj.objectName}
                    <span className="block text-xs text-gray-400 font-normal mt-0.5">{obj.category}</span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mapping table */}
        <div className="flex-1">
          {selectedObj ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{selectedObj.objectName}</CardTitle>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {mappings.length} value mapping{mappings.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                  className="bg-[#1e3a5f] hover:bg-[#2a4f7c] gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Mapping
                </Button>
              </CardHeader>
              <CardContent>
                {loadingMaps ? (
                  <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-300" /></div>
                ) : mappings.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <MapPin className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm mb-1">No mappings yet</p>
                    <p className="text-xs">Add value mappings to translate source values to SAP values</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add first mapping
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Field</TableHead>
                        <TableHead>Source Value</TableHead>
                        <TableHead className="w-6"></TableHead>
                        <TableHead>Target Value (SAP)</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappings.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{m.fieldLabel ?? m.fieldName}</p>
                              <p className="text-xs text-gray-400 font-mono">{m.fieldName}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">{m.sourceValue}</Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-xs bg-green-50 text-green-800">{m.targetValue}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-red-500"
                              onClick={() => deleteMapping(m.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Select an object on the left to manage its value mappings</p>
            </div>
          )}
        </div>
      </div>

      {/* Add mapping dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Value Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Field</Label>
              {objDef ? (
                <Select value={form.fieldName} onValueChange={(v) => setForm((f) => ({ ...f, fieldName: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a field…" />
                  </SelectTrigger>
                  <SelectContent>
                    {objDef.fields.map((f) => (
                      <SelectItem key={f.name} value={f.name}>
                        {f.label} <span className="text-gray-400 font-mono text-xs ml-1">({f.name})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder="Field name (e.g. WAERS)" value={form.fieldName} onChange={(e) => setForm((f) => ({ ...f, fieldName: e.target.value }))} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Source Value</Label>
                <Input placeholder="e.g. USD" value={form.sourceValue} onChange={(e) => setForm((f) => ({ ...f, sourceValue: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Target Value (SAP)</Label>
                <Input placeholder="e.g. US Dollar" value={form.targetValue} onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={addMapping} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#2a4f7c]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
