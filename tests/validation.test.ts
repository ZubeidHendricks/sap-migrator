import { describe, it, expect } from 'vitest'
import {
  validatePassword,
  isValidEmail,
  isValidRunType,
  isValidObjectStatus,
  isValidExtractTarget,
  isValidProjectStatus,
  validateExtractJob,
  generateTempPassword,
  MIN_PASSWORD_LENGTH,
} from '@/lib/validation'

describe('validatePassword', () => {
  it('rejects empty / non-string', () => {
    expect(validatePassword('')).toMatch(/required/i)
    expect(validatePassword(undefined)).toMatch(/required/i)
    expect(validatePassword(12345678)).toMatch(/required/i)
  })
  it('rejects passwords shorter than the minimum', () => {
    expect(validatePassword('short')).toMatch(/at least/i)
  })
  it('accepts a sufficiently long password', () => {
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH))).toBeNull()
  })
})

describe('isValidEmail', () => {
  it('accepts valid addresses', () => {
    expect(isValidEmail('zubeid@company.com')).toBe(true)
    expect(isValidEmail('a.b+tag@sub.domain.co.za')).toBe(true)
  })
  it('rejects invalid addresses', () => {
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('missing@domain')).toBe(false)
    expect(isValidEmail('@nodomain.com')).toBe(false)
    expect(isValidEmail(123)).toBe(false)
  })
})

describe('enum guards', () => {
  it('isValidRunType', () => {
    expect(isValidRunType('SIMULATION')).toBe(true)
    expect(isValidRunType('MIGRATION')).toBe(true)
    expect(isValidRunType('TESTRUN')).toBe(false)
  })
  it('isValidObjectStatus', () => {
    expect(isValidObjectStatus('DONE')).toBe(true)
    expect(isValidObjectStatus('PENDING')).toBe(true)
    expect(isValidObjectStatus('ARCHIVED')).toBe(false)
  })
  it('isValidExtractTarget', () => {
    expect(isValidExtractTarget('POSTGRESQL')).toBe(true)
    expect(isValidExtractTarget('SNOWFLAKE')).toBe(true)
    expect(isValidExtractTarget('BIGQUERY')).toBe(true)
    expect(isValidExtractTarget('CSV_DOWNLOAD')).toBe(true)
    expect(isValidExtractTarget('MYSQL')).toBe(false)
  })
  it('isValidProjectStatus', () => {
    expect(isValidProjectStatus('IN_PROGRESS')).toBe(true)
    expect(isValidProjectStatus('NOPE')).toBe(false)
  })
})

describe('validateExtractJob', () => {
  it('requires a name', () => {
    expect(validateExtractJob({ targetType: 'POSTGRESQL', objectKeys: ['X'] })).toMatch(/name/i)
    expect(validateExtractJob({ name: '   ', targetType: 'POSTGRESQL', objectKeys: ['X'] })).toMatch(/name/i)
  })
  it('requires a valid target type', () => {
    expect(validateExtractJob({ name: 'Job', targetType: 'ORACLE', objectKeys: ['X'] })).toMatch(/targetType/i)
  })
  it('requires at least one object', () => {
    expect(validateExtractJob({ name: 'Job', targetType: 'CSV_DOWNLOAD', objectKeys: [] })).toMatch(/object/i)
    expect(validateExtractJob({ name: 'Job', targetType: 'CSV_DOWNLOAD' })).toMatch(/object/i)
  })
  it('passes a complete payload', () => {
    expect(validateExtractJob({ name: 'Monthly GL', targetType: 'POSTGRESQL', objectKeys: ['GL_ACCOUNT'] })).toBeNull()
  })
})

describe('generateTempPassword', () => {
  it('produces a password that meets the policy', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generateTempPassword()
      expect(pw.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH)
      expect(validatePassword(pw)).toBeNull()
    }
  })
  it('produces distinct values', () => {
    const a = generateTempPassword()
    const b = generateTempPassword()
    expect(a).not.toBe(b)
  })
})
