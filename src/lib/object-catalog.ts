// Org-aware object catalog: merges the built-in SAP object catalog with an
// organization's custom object definitions. Pure helpers (adapter + validation)
// are unit-tested; the async resolvers use Prisma.

import { prisma } from './prisma'
import {
  MIGRATION_OBJECTS,
  getObjectByKey,
  type MigrationObject,
  type MigrationObjectField,
} from './migration-objects'

const FIELD_TYPES = ['string', 'number', 'date', 'boolean'] as const
const APPROACHES = ['STAGING_TABLES', 'DIRECT_TRANSFER'] as const

export interface CustomObjectInput {
  key?: unknown
  name?: unknown
  category?: unknown
  description?: unknown
  sapTable?: unknown
  approach?: unknown
  fields?: unknown
}

const BUILTIN_KEYS = new Set(MIGRATION_OBJECTS.map((o) => o.key))

/** Validate a custom object definition. Returns an error string or null. */
export function validateCustomObject(input: CustomObjectInput): string | null {
  const key = typeof input.key === 'string' ? input.key.trim() : ''
  if (!key) return 'Object key is required'
  if (!/^[A-Z][A-Z0-9_]{1,39}$/.test(key)) {
    return 'Key must be UPPERCASE letters, numbers and underscores (start with a letter), 2–40 chars'
  }
  if (BUILTIN_KEYS.has(key)) return `Key "${key}" is reserved by a built-in object`

  if (typeof input.name !== 'string' || !input.name.trim()) return 'Object name is required'
  if (typeof input.category !== 'string' || !input.category.trim()) return 'Category is required'

  if (!Array.isArray(input.approach) || input.approach.length === 0) return 'Select at least one approach'
  for (const a of input.approach) {
    if (!(APPROACHES as readonly unknown[]).includes(a)) return `Invalid approach: ${String(a)}`
  }

  if (!Array.isArray(input.fields) || input.fields.length === 0) return 'Add at least one field'
  const seen = new Set<string>()
  for (const f of input.fields) {
    const fld = f as Record<string, unknown>
    const fname = typeof fld.name === 'string' ? fld.name.trim() : ''
    if (!fname) return 'Every field needs a technical name'
    if (!/^[A-Za-z][A-Za-z0-9_]{0,29}$/.test(fname)) return `Invalid field name: ${fname}`
    if (seen.has(fname.toUpperCase())) return `Duplicate field name: ${fname}`
    seen.add(fname.toUpperCase())
    if (typeof fld.label !== 'string' || !fld.label.trim()) return `Field ${fname} needs a label`
    if (!(FIELD_TYPES as readonly unknown[]).includes(fld.type)) return `Field ${fname} has an invalid type`
    if (fld.maxLength != null && (typeof fld.maxLength !== 'number' || fld.maxLength <= 0)) {
      return `Field ${fname} has an invalid max length`
    }
  }
  return null
}

/** Normalize validated input into the stored shape. */
export function normalizeCustomObject(input: CustomObjectInput) {
  const fields: MigrationObjectField[] = (input.fields as Record<string, unknown>[]).map((f) => ({
    name: String(f.name).trim(),
    label: String(f.label).trim(),
    required: !!f.required,
    type: f.type as MigrationObjectField['type'],
    ...(f.maxLength != null ? { maxLength: Number(f.maxLength) } : {}),
    ...(typeof f.example === 'string' && f.example ? { example: f.example } : {}),
  }))
  return {
    key: String(input.key).trim(),
    name: String(input.name).trim(),
    category: String(input.category).trim(),
    description: typeof input.description === 'string' && input.description.trim() ? input.description.trim() : null,
    sapTable: typeof input.sapTable === 'string' && input.sapTable.trim() ? input.sapTable.trim() : null,
    approach: input.approach as string[],
    fields,
  }
}

/** Adapt a stored CustomObject record into a MigrationObject. */
export function customToMigrationObject(rec: {
  key: string
  name: string
  category: string
  description: string | null
  sapTable: string | null
  approach: unknown
  fields: unknown
}): MigrationObject & { custom: true } {
  return {
    key: rec.key,
    name: rec.name,
    category: rec.category as MigrationObject['category'],
    description: rec.description ?? '',
    sapTable: rec.sapTable ?? undefined,
    approach: (Array.isArray(rec.approach) ? rec.approach : []) as MigrationObject['approach'],
    fields: (Array.isArray(rec.fields) ? rec.fields : []) as MigrationObjectField[],
    custom: true,
  }
}

/** Resolve a single object by key for an org (built-in first, then custom). */
export async function resolveObject(key: string, organizationId: string): Promise<MigrationObject | null> {
  const builtin = getObjectByKey(key)
  if (builtin) return builtin
  const rec = await prisma.customObject.findFirst({ where: { organizationId, key } })
  return rec ? customToMigrationObject(rec) : null
}

/** List the full catalog (built-in + custom) for an org. */
export async function listCatalog(organizationId: string): Promise<MigrationObject[]> {
  const custom = await prisma.customObject.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  })
  return [...MIGRATION_OBJECTS, ...custom.map(customToMigrationObject)]
}
