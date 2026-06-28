'use client'

import { useState, useEffect } from 'react'
import { signIn, getProviders } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useT } from '@/lib/i18n/context'

export default function LoginPage() {
  const router = useRouter()
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ssoProvider, setSsoProvider] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    getProviders().then((p) => {
      const oidc = p?.oidc
      if (oidc) setSsoProvider({ id: oidc.id, name: oidc.name })
    })
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'NoAccount') {
      setError('No SAP Migrator account exists for that email. Ask your admin to invite you first.')
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError(t('auth.invalidCredentials'))
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg border-gray-100">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">{t('auth.welcomeBack')}</CardTitle>
        <CardDescription>{t('auth.signInSubtitle')}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Link href="/forgot-password" className="text-xs text-[#1e3a5f] hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full bg-[#1e3a5f] hover:bg-[#2a4f7c]" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('auth.signingIn')}</> : t('auth.signIn')}
          </Button>

          {ssoProvider && (
            <>
              <div className="flex items-center gap-3 w-full">
                <div className="h-px bg-gray-200 flex-1" />
                <span className="text-xs text-gray-400">or</span>
                <div className="h-px bg-gray-200 flex-1" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => signIn(ssoProvider.id, { callbackUrl: '/dashboard' })}
              >
                <ShieldCheck className="h-4 w-4" /> Sign in with {ssoProvider.name}
              </Button>
            </>
          )}

          <p className="text-sm text-center text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <Link href="/register" className="text-[#1e3a5f] font-medium hover:underline">
              {t('auth.createWorkspace')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
