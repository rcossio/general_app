'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { activeModules } from '@/config/modules'
import * as Icons from 'lucide-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useChrome } from '@/contexts/ChromeContext'

const MODULE_NAV_KEYS: Record<string, string> = {
  workout: 'nav.workout',
  'life-tracker': 'nav.lifeTracker',
  adventure: 'nav.adventure',
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuth()
  const { t } = useLocale()
  const { hideChrome } = useChrome()
  if (hideChrome) return null

  const isAdmin = user?.roles.some((r) => ['master_admin', 'admin'].includes(r))

  const navItems = [
    { label: t('nav.dashboard'), href: '/dashboard', icon: 'Home' },
    ...activeModules.map((m) => ({ ...m.navItem, label: t(MODULE_NAV_KEYS[m.id] ?? 'nav.home') })),
    { label: t('nav.profile'), href: '/profile', icon: 'User' },
    ...(isAdmin ? [{ label: t('nav.admin'), href: '/admin', icon: 'Shield' }] : []),
  ]

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-brand-green transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/20">
        {!collapsed && (
          <span className="font-rubik font-extrabold text-white text-[26px] truncate">
            vysi
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1 rounded hover:bg-white/10 text-white/70"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[item.icon]
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-rubik font-semibold transition-colors ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {IconComponent ? <IconComponent className="h-5 w-5 flex-shrink-0" /> : null}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
