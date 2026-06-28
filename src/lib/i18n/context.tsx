'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  type Locale, type TranslationKey, translate, isLocale, dirFor, DEFAULT_LOCALE,
} from './dictionaries'

const STORAGE_KEY = 'sapmigrator.locale'

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (k) => translate(DEFAULT_LOCALE, k),
})

function applyDir(locale: Locale) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
    document.documentElement.dir = dirFor(locale)
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    if (isLocale(stored)) {
      setLocaleState(stored)
      applyDir(stored)
    }
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    applyDir(l)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, l)
      // also drop a cookie so a future server-side render could read it
      document.cookie = `${STORAGE_KEY}=${l}; path=/; max-age=31536000; samesite=lax`
    }
  }, [])

  const t = useCallback((key: TranslationKey) => translate(locale, key), [locale])

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}

/** Convenience hook returning just the translate function. */
export function useT() {
  return useContext(I18nContext).t
}
