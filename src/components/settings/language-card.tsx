'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Languages } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { LOCALES, type Locale } from '@/lib/i18n/dictionaries'

export function LanguageCard() {
  const { locale, setLocale, t } = useI18n()
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Languages className="w-4 h-4 text-[#1e3a5f]" />
          </div>
          <div>
            <CardTitle className="text-base">{t('settings.language')}</CardTitle>
            <CardDescription>{t('settings.languageDesc')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-w-xs">
          <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LOCALES.map((l) => (
                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
