import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, Shield } from 'lucide-react'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const [org, users] = await Promise.all([
    prisma.organization.findUnique({ where: { id: session.user.organizationId } }),
    prisma.user.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-0.5">Manage your workspace and team</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-[#1e3a5f]" />
              </div>
              <div>
                <CardTitle className="text-base">Organization</CardTitle>
                <CardDescription>Your company workspace details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Name</p>
                <p className="text-sm font-medium text-gray-900">{org?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Slug</p>
                <p className="text-sm font-mono text-gray-700">{org?.slug}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Plan</p>
                <Badge variant="secondary" className="capitalize">{org?.plan}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Members</p>
                <p className="text-sm font-medium text-gray-900">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-[#1e3a5f]" />
              </div>
              <div>
                <CardTitle className="text-base">Team Members</CardTitle>
                <CardDescription>Users with access to this workspace</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <RoleBadge role={u.role} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#1e3a5f]" />
              </div>
              <div>
                <CardTitle className="text-base">Your Account</CardTitle>
                <CardDescription>Your profile and role in this workspace</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Name</p>
                <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</p>
                <p className="text-sm text-gray-700">{session.user.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Role</p>
                <RoleBadge role={session.user.role} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'info' }> = {
    ADMIN: { label: 'Admin', variant: 'default' },
    MIGRATOR: { label: 'Migrator', variant: 'info' },
    VIEWER: { label: 'Viewer', variant: 'secondary' },
  }
  const s = map[role] ?? { label: role, variant: 'secondary' }
  return <Badge variant={s.variant as any}>{s.label}</Badge>
}
