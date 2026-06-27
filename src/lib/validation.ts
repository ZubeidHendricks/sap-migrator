// Pure validation helpers shared across API routes. Dependency-free
// so they can be unit-tested and reused on client and server.

export const MIN_PASSWORD_LENGTH = 8

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length === 0) return 'Password is required'
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  return null
}

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const RUN_TYPES = ['SIMULATION', 'MIGRATION'] as const
export type RunType = (typeof RUN_TYPES)[number]
export function isValidRunType(type: unknown): type is RunType {
  return typeof type === 'string' && (RUN_TYPES as readonly string[]).includes(type)
}

export const OBJECT_STATUSES = ['PENDING', 'MAPPED', 'READY', 'DONE'] as const
export type ObjectStatus = (typeof OBJECT_STATUSES)[number]
export function isValidObjectStatus(status: unknown): status is ObjectStatus {
  return typeof status === 'string' && (OBJECT_STATUSES as readonly string[]).includes(status)
}

export const EXTRACT_TARGETS = ['POSTGRESQL', 'SNOWFLAKE', 'BIGQUERY', 'CSV_DOWNLOAD'] as const
export type ExtractTarget = (typeof EXTRACT_TARGETS)[number]
export function isValidExtractTarget(target: unknown): target is ExtractTarget {
  return typeof target === 'string' && (EXTRACT_TARGETS as readonly string[]).includes(target)
}

export const PROJECT_STATUSES = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]
export function isValidProjectStatus(status: unknown): status is ProjectStatus {
  return typeof status === 'string' && (PROJECT_STATUSES as readonly string[]).includes(status)
}

export interface ExtractJobInput {
  name?: unknown
  targetType?: unknown
  objectKeys?: unknown
}

/** Validate the body of a new extract job. Returns an error string or null. */
export function validateExtractJob(body: ExtractJobInput): string | null {
  if (typeof body.name !== 'string' || !body.name.trim()) return 'name is required'
  if (!isValidExtractTarget(body.targetType)) return 'A valid targetType is required'
  if (!Array.isArray(body.objectKeys) || body.objectKeys.length === 0) return 'At least one object must be selected'
  return null
}

/** Generate a temporary password for invited members. */
export function generateTempPassword(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
}
