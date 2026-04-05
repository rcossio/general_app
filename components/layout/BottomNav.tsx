'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { activeModules } from '@/config/modules'
import * as Icons from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useChrome } from '@/contexts/ChromeContext'

const MODULE_NAV_KEYS: Record<string, string> = {
  workout: 'nav.workout',
  'life-tracker': 'nav.lifeTracker',
  adventure: 'nav.adventure',
}

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { t } = useLocale()
  const { hideChrome } = useChrome()
  if (hideChrome) return null

  const isAdmin = user?.roles?.some((r) => ['master_admin', 'admin'].includes(r))

  const navItems = [
    { label: t('nav.home'), href: '/dashboard', icon: 'Home' },
    ...activeModules.map((m) => ({ ...m.navItem, label: t(MODULE_NAV_KEYS[m.id] ?? 'nav.home') })),
    { label: t('nav.profile'), href: '/profile', icon: 'User' },
    ...(isAdmin ? [{ label: t('nav.admin'), href: '/admin', icon: 'Shield' }] : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[item.icon]
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {IconComponent ? <IconComponent className="h-5 w-5" /> : null}
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
