import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { listCatalog } from '@/lib/object-catalog'

// Merged object catalog (built-in + this org's custom objects) for the app UI.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const objects = await listCatalog(session.user.organizationId)
  return NextResponse.json(objects)
}
