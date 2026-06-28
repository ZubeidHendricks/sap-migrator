import { NextAuthOptions } from 'next-auth'
import type { Provider } from 'next-auth/providers/index'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { getSsoConfig, wellKnownUrl, OIDC_PROVIDER_ID } from './sso'

const providers: Provider[] = [
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
        include: { organization: true },
      })

      if (!user || !user.password) return null

      const valid = await bcrypt.compare(credentials.password, user.password)
      if (!valid) return null

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        mustChangePassword: user.mustChangePassword,
      }
    },
  }),
]

// Optional OIDC SSO — only registered when configured via env.
const sso = getSsoConfig()
if (sso) {
  providers.push({
    id: OIDC_PROVIDER_ID,
    name: sso.name,
    type: 'oauth',
    wellKnown: wellKnownUrl(sso.issuer),
    clientId: sso.clientId,
    clientSecret: sso.clientSecret,
    authorization: { params: { scope: 'openid email profile' } },
    idToken: true,
    checks: ['pkce', 'state'],
    profile(profile: Record<string, unknown>) {
      // org/role are resolved from the DB in the jwt callback; these are
      // type-complete placeholders that get overwritten on sign-in.
      return {
        id: String(profile.sub),
        name: (profile.name as string) ?? (profile.email as string) ?? null,
        email: (profile.email as string) ?? null,
        role: '',
        organizationId: '',
        organizationName: '',
        mustChangePassword: false,
      }
    },
  })
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      // SSO authenticates identity; only allow users who have been provisioned
      // (invited) so we never auto-create an account in an unknown org.
      if (account?.provider === OIDC_PROVIDER_ID) {
        if (!user.email) return false
        const exists = await prisma.user.findUnique({ where: { email: user.email } })
        return exists ? true : '/login?error=NoAccount'
      }
      return true
    },
    async jwt({ token, user, account }) {
      // Credentials path: the authorize() result already carries org/role.
      if (user && account?.provider !== OIDC_PROVIDER_ID) {
        token.id = user.id
        token.role = user.role
        token.organizationId = user.organizationId
        token.organizationName = user.organizationName
        token.mustChangePassword = user.mustChangePassword
        return token
      }
      // SSO path: load org/role from the DB by email on first sign-in.
      if (user && account?.provider === OIDC_PROVIDER_ID && user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { organization: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.organizationId = dbUser.organizationId
          token.organizationName = dbUser.organization.name
          token.mustChangePassword = dbUser.mustChangePassword
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.organizationId = token.organizationId
        session.user.organizationName = token.organizationName
        ;(session.user as Record<string, unknown>).mustChangePassword = token.mustChangePassword
      }
      return session
    },
  },
}
