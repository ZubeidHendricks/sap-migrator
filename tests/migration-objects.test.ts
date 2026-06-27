import { describe, it, expect } from 'vitest'
import {
  MIGRATION_OBJECTS,
  getObjectByKey,
  getObjectsByCategory,
} from '@/lib/migration-objects'

describe('MIGRATION_OBJECTS catalog integrity', () => {
  it('has a non-trivial number of objects', () => {
    expect(MIGRATION_OBJECTS.length).toBeGreaterThan(10)
  })

  it('every object has a unique key', () => {
    const keys = MIGRATION_OBJECTS.map((o) => o.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('every object has at least one field', () => {
    for (const obj of MIGRATION_OBJECTS) {
      expect(obj.fields.length, `${obj.key} should have fields`).toBeGreaterThan(0)
    }
  })

  it('every object declares at least one approach', () => {
    for (const obj of MIGRATION_OBJECTS) {
      expect(obj.approach.length, `${obj.key} should have an approach`).toBeGreaterThan(0)
    }
  })

  it('every object has at least one required field', () => {
    for (const obj of MIGRATION_OBJECTS) {
      expect(obj.fields.some((f) => f.required), `${obj.key} should have a required field`).toBe(true)
    }
  })
})

describe('getObjectByKey', () => {
  it('finds an existing object', () => {
    const obj = getObjectByKey('GL_ACCOUNT')
    expect(obj).toBeDefined()
    expect(obj?.name).toBe('General Ledger Account')
  })
  it('returns undefined for an unknown key', () => {
    expect(getObjectByKey('DOES_NOT_EXIST')).toBeUndefined()
  })
})

describe('getObjectsByCategory', () => {
  it('groups all objects by category when no approach filter is given', () => {
    const grouped = getObjectsByCategory()
    const total = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0)
    expect(total).toBe(MIGRATION_OBJECTS.length)
  })

  it('only includes objects matching the requested approach', () => {
    const grouped = getObjectsByCategory('DIRECT_TRANSFER')
    for (const list of Object.values(grouped)) {
      for (const obj of list) {
        expect(obj.approach).toContain('DIRECT_TRANSFER')
      }
    }
  })

  it('returns objects keyed by their declared category', () => {
    const grouped = getObjectsByCategory()
    for (const [category, list] of Object.entries(grouped)) {
      for (const obj of list) {
        expect(obj.category).toBe(category)
      }
    }
  })
})
