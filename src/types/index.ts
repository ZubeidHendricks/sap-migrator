import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
      organizationId: string
      organizationName: string
    }
  }
}

export type { MigrationObject, MigrationObjectField, MigrationObjectCategory } from '@/lib/migration-objects'
