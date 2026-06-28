// CSV extract target — turns extracted rows into a real CSV document.
import { toCSV } from '../csv'
import type { MigrationObjectField } from '../migration-objects'

export interface ObjectExtract {
  objectKey: string
  objectName: string
  fields: MigrationObjectField[]
  rows: Record<string, string>[]
}

/** Build a single CSV covering one or more extracted objects.
 *  Each object gets a header block (Object + field names) then its rows. */
export function buildExtractCsv(extracts: ObjectExtract[]): string {
  const out: unknown[][] = []
  extracts.forEach((ex, idx) => {
    if (idx > 0) out.push([])
    out.push([`# ${ex.objectName} (${ex.objectKey})`])
    out.push(ex.fields.map((f) => f.name))
    for (const row of ex.rows) {
      out.push(ex.fields.map((f) => row[f.name] ?? ''))
    }
  })
  return toCSV(out)
}
