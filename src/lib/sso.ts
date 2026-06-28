// OIDC SSO configuration helpers. SSO is enabled instance-wide when the three
// OIDC_* env vars are present; otherwise the app uses email/password only.
// Multi-tenancy is preserved: SSO authenticates identity, but a user can only
// sign in if an account with their email has already been provisioned (invited).

export interface SsoConfig {
  issuer: string
  clientId: string
  clientSecret: string
  name: string
}

export function getSsoConfig(env: NodeJS.ProcessEnv = process.env): SsoConfig | null {
  const issuer = env.OIDC_ISSUER?.trim()
  const clientId = env.OIDC_CLIENT_ID?.trim()
  const clientSecret = env.OIDC_CLIENT_SECRET?.trim()
  if (!issuer || !clientId || !clientSecret) return null
  return { issuer, clientId, clientSecret, name: env.OIDC_NAME?.trim() || 'SSO' }
}

export function isSsoEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return getSsoConfig(env) !== null
}

/** Discovery URL for the issuer (handles a trailing slash). */
export function wellKnownUrl(issuer: string): string {
  return `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`
}

export const OIDC_PROVIDER_ID = 'oidc'
