'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { activeModules } from '@/config/modules'
import * as Icons from 'lucide-react'
import { Home, User } from 'lucide-react'

const coreNavItems = [
  { label: 'Home', href: '/', icon: 'Home' },
  { label: 'Profile', href: '/profile', icon: 'User' },
]

export function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    coreNavItems[0],
    ...activeModules.map((m) => m.navItem),
    coreNavItems[1],
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
