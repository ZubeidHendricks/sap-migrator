import { describe, it, expect } from 'vitest'
import { dictionaries, translate, isLocale, dirFor, LOCALES, type Locale, type TranslationKey } from '@/lib/i18n/dictionaries'

const enKeys = Object.keys(dictionaries.en) as TranslationKey[]

describe('dictionaries', () => {
  it('has all 5 locales', () => {
    expect(LOCALES.map((l) => l.code).sort()).toEqual(['af', 'ar', 'de', 'en', 'fr'])
  })

  it('every locale defines every English key (no missing translations)', () => {
    for (const { code } of LOCALES) {
      const keys = Object.keys(dictionaries[code as Locale])
      for (const k of enKeys) {
        expect(dictionaries[code as Locale][k], `${code} missing ${k}`).toBeTruthy()
      }
      expect(keys.length).toBe(enKeys.length)
    }
  })

  it('translations actually differ from English for non-English locales', () => {
    // sanity: at least the nav labels should be translated in de/fr/ar
    expect(dictionaries.de['nav.settings']).not.toBe(dictionaries.en['nav.settings'])
    expect(dictionaries.fr['nav.projects']).not.toBe(dictionaries.en['nav.projects'])
    expect(dictionaries.ar['nav.dashboard']).not.toBe(dictionaries.en['nav.dashboard'])
  })
})

describe('translate', () => {
  it('returns the locale string', () => {
    expect(translate('de', 'nav.settings')).toBe('Einstellungen')
    expect(translate('fr', 'common.save')).toBe('Enregistrer')
  })
  it('falls back to English for an unknown locale', () => {
    expect(translate('xx' as Locale, 'nav.dashboard')).toBe('Dashboard')
  })
})

describe('isLocale', () => {
  it('validates supported codes', () => {
    expect(isLocale('ar')).toBe(true)
    expect(isLocale('zz')).toBe(false)
    expect(isLocale(123)).toBe(false)
  })
})

describe('dirFor', () => {
  it('marks Arabic as RTL and others LTR', () => {
    expect(dirFor('ar')).toBe('rtl')
    expect(dirFor('en')).toBe('ltr')
    expect(dirFor('de')).toBe('ltr')
  })
})
