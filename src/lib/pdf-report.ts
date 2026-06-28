// Project status report as a real PDF, built with pdf-lib (pure JS, no native deps).
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib'

const NAVY = rgb(0.118, 0.227, 0.373)
const GREY = rgb(0.42, 0.45, 0.5)
const LIGHT = rgb(0.9, 0.92, 0.94)
const GREEN = rgb(0.11, 0.5, 0.23)
const RED = rgb(0.8, 0.2, 0.2)

export interface ProjectReportData {
  projectName: string
  status: string
  approach: string
  generatedAt: string
  sourceSystem?: string | null
  targetSystem?: string | null
  goLiveDate?: string | null
  quality: { score: number; grade: string }
  stats: { objects: number; mapped: number; done: number; runs: number; readinessPct: number }
  objects: { objectKey: string; objectName: string; category: string; status: string }[]
  runs: { type: string; status: string; totalRecords: number; successCount: number; errorCount: number; createdAt: string }[]
  orgName: string
}

export async function generateProjectReportPdf(d: ProjectReportData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const margin = 50
  const width = 595.28 // A4
  const height = 841.89
  let page = pdf.addPage([width, height])
  let y = height - margin

  function newPage() { page = pdf.addPage([width, height]); y = height - margin }
  function ensure(space: number) { if (y - space < margin) newPage() }
  function text(s: string, opts: { x?: number; size?: number; font?: PDFFont; color?: typeof NAVY } = {}) {
    page.drawText(s, { x: opts.x ?? margin, y, size: opts.size ?? 10, font: opts.font ?? font, color: opts.color ?? rgb(0.1, 0.1, 0.1) })
  }
  function line(color = LIGHT) {
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color })
  }
  function clip(s: string, max: number, f: PDFFont, size: number): string {
    let str = s
    while (f.widthOfTextAtSize(str, size) > max && str.length > 1) str = str.slice(0, -1)
    return str === s ? s : str.slice(0, -1) + '…'
  }

  // Header
  text('SAP Migrator', { font: bold, size: 22, color: NAVY }); y -= 24
  text('Project Status Report', { size: 12, color: GREY }); y -= 22
  text(`${d.orgName}  ·  Generated ${d.generatedAt}`, { size: 9, color: GREY }); y -= 18
  line(); y -= 24

  // Project meta
  text(d.projectName, { font: bold, size: 16, color: NAVY }); y -= 20
  const metaBits = [
    `Status: ${d.status}`,
    `Approach: ${d.approach}`,
    ...(d.sourceSystem ? [`Source: ${d.sourceSystem}`] : []),
    ...(d.targetSystem ? [`Target: ${d.targetSystem}`] : []),
    ...(d.goLiveDate ? [`Go-live: ${d.goLiveDate}`] : []),
  ]
  text(metaBits.join('    '), { size: 9.5, color: GREY }); y -= 26

  // Summary metrics row
  text('Summary', { font: bold, size: 12, color: NAVY }); y -= 18
  const cards: [string, string][] = [
    ['Quality Score', `${d.quality.score}/100 (${d.quality.grade})`],
    ['Readiness', `${d.stats.readinessPct}%`],
    ['Objects', `${d.stats.objects}`],
    ['Completed', `${d.stats.done}`],
    ['Migration Runs', `${d.stats.runs}`],
  ]
  const colW = (width - margin * 2) / cards.length
  cards.forEach(([label, val], i) => {
    const x = margin + i * colW
    page.drawText(val, { x, y, size: 13, font: bold, color: NAVY })
    page.drawText(label, { x, y: y - 14, size: 7.5, font, color: GREY })
  })
  y -= 40
  line(); y -= 22

  // Objects table
  text('Migration Objects', { font: bold, size: 12, color: NAVY }); y -= 18
  const cols = [
    { h: 'Object Key', x: margin, w: 120 },
    { h: 'Name', x: margin + 125, w: 210 },
    { h: 'Category', x: margin + 340, w: 90 },
    { h: 'Status', x: margin + 435, w: 60 },
  ]
  function tableHeader() {
    cols.forEach((c) => page.drawText(c.h, { x: c.x, y, size: 8, font: bold, color: GREY }))
    y -= 4; line(); y -= 12
  }
  tableHeader()
  if (d.objects.length === 0) { text('No objects selected.', { size: 9, color: GREY }); y -= 14 }
  for (const o of d.objects) {
    ensure(16)
    if (y === height - margin) tableHeader()
    page.drawText(clip(o.objectKey, cols[0].w, font, 8.5), { x: cols[0].x, y, size: 8.5, font })
    page.drawText(clip(o.objectName, cols[1].w, font, 8.5), { x: cols[1].x, y, size: 8.5, font })
    page.drawText(clip(o.category, cols[2].w, font, 8.5), { x: cols[2].x, y, size: 8.5, font, color: GREY })
    const stColor = o.status === 'DONE' ? GREEN : o.status === 'PENDING' ? GREY : NAVY
    page.drawText(o.status, { x: cols[3].x, y, size: 8.5, font: bold, color: stColor })
    y -= 15
  }
  y -= 12

  // Runs table
  ensure(60)
  line(); y -= 22
  text('Recent Migration Runs', { font: bold, size: 12, color: NAVY }); y -= 18
  const rcols = [
    { h: 'Type', x: margin },
    { h: 'Status', x: margin + 100 },
    { h: 'Records', x: margin + 200 },
    { h: 'Success', x: margin + 290 },
    { h: 'Errors', x: margin + 380 },
    { h: 'Date', x: margin + 450 },
  ]
  rcols.forEach((c) => page.drawText(c.h, { x: c.x, y, size: 8, font: bold, color: GREY }))
  y -= 4; line(); y -= 12
  if (d.runs.length === 0) { text('No runs yet.', { size: 9, color: GREY }); y -= 14 }
  for (const r of d.runs) {
    ensure(16)
    page.drawText(r.type === 'SIMULATION' ? 'Simulation' : 'Migration', { x: rcols[0].x, y, size: 8.5, font })
    page.drawText(r.status, { x: rcols[1].x, y, size: 8.5, font })
    page.drawText(String(r.totalRecords), { x: rcols[2].x, y, size: 8.5, font })
    page.drawText(String(r.successCount), { x: rcols[3].x, y, size: 8.5, font, color: GREEN })
    page.drawText(String(r.errorCount), { x: rcols[4].x, y, size: 8.5, font, color: r.errorCount > 0 ? RED : GREY })
    page.drawText(r.createdAt, { x: rcols[5].x, y, size: 8, font, color: GREY })
    y -= 15
  }

  // Footer on every page
  const pages = pdf.getPages()
  pages.forEach((p, i) => {
    p.drawText(`SAP Migrator  ·  Confidential  ·  Page ${i + 1} of ${pages.length}`, {
      x: margin, y: 28, size: 7.5, font, color: GREY,
    })
  })

  return pdf.save()
}
