import { describe, it, expect } from 'vitest'
import { getSsoConfig, isSsoEnabled, wellKnownUrl, OIDC_PROVIDER_ID } from '@/lib/sso'

const full = {
  OIDC_ISSUER: 'https://idp.example.com',
  OIDC_CLIENT_ID: 'client-123',
  OIDC_CLIENT_SECRET: 'secret-xyz',
} as unknown as NodeJS.ProcessEnv

describe('getSsoConfig', () => {
  it('returns null when no OIDC vars are set', () => {
    expect(getSsoConfig({} as NodeJS.ProcessEnv)).toBeNull()
  })
  it('returns null when only some vars are set', () => {
    expect(getSsoConfig({ OIDC_ISSUER: 'x' } as unknown as NodeJS.ProcessEnv)).toBeNull()
    expect(getSsoConfig({ OIDC_ISSUER: 'x', OIDC_CLIENT_ID: 'y' } as unknown as NodeJS.ProcessEnv)).toBeNull()
  })
  it('returns config when all three are set, defaulting the name', () => {
    const cfg = getSsoConfig(full)
    expect(cfg).toEqual({ issuer: 'https://idp.example.com', clientId: 'client-123', clientSecret: 'secret-xyz', name: 'SSO' })
  })
  it('uses OIDC_NAME when provided', () => {
    expect(getSsoConfig({ ...full, OIDC_NAME: 'Okta' } as NodeJS.ProcessEnv)?.name).toBe('Okta')
  })
  it('trims whitespace and ignores blank values', () => {
    expect(getSsoConfig({ OIDC_ISSUER: '  ', OIDC_CLIENT_ID: 'a', OIDC_CLIENT_SECRET: 'b' } as unknown as NodeJS.ProcessEnv)).toBeNull()
  })
})

describe('isSsoEnabled', () => {
  it('reflects whether config is present', () => {
    expect(isSsoEnabled({} as NodeJS.ProcessEnv)).toBe(false)
    expect(isSsoEnabled(full)).toBe(true)
  })
})

describe('wellKnownUrl', () => {
  it('builds the discovery URL', () => {
    expect(wellKnownUrl('https://idp.example.com')).toBe('https://idp.example.com/.well-known/openid-configuration')
  })
  it('handles a trailing slash', () => {
    expect(wellKnownUrl('https://idp.example.com/')).toBe('https://idp.example.com/.well-known/openid-configuration')
  })
})

describe('constants', () => {
  it('exposes the provider id', () => {
    expect(OIDC_PROVIDER_ID).toBe('oidc')
  })
})
