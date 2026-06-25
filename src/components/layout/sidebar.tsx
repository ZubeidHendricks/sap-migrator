'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FolderKanban, Settings, LogOut, Database, ChevronDown, Building2,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const initials = session?.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '??'

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-[#1e3a5f] text-white flex flex-col z-30">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
        <div className="w-7 h-7 rounded-md bg-white/15 flex items-center justify-center">
          <Database className="w-4 h-4" />
        </div>
        <span className="font-bold text-sm">SAP Migrator</span>
      </div>

      {/* Org badge */}
      <div className="px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{session?.user?.organizationName ?? '…'}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active ? 'bg-white/15 text-white font-medium' : 'text-white/60 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-left">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-white/20 text-white text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{session?.user?.name}</p>
                <p className="text-xs text-white/50 truncate">{session?.user?.role}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-white/40 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52 mb-1">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })} className="text-red-600 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
