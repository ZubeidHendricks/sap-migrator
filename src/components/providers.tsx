'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from '@/components/ui/toaster'
import { I18nProvider } from '@/lib/i18n/context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        {children}
        <Toaster />
      </I18nProvider>
    </SessionProvider>
  )
}
