'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as Icons from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useChrome } from '@/contexts/ChromeContext'
import { buildNavItems } from '@/lib/navItems'
import { isAdminRole } from '@/lib/roles'

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { t } = useLocale()
  const { hideChrome } = useChrome()
  if (hideChrome) return null

  const navItems = buildNavItems(t, isAdminRole(user?.roles))

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-brand-green md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[item.icon]
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs font-rubik font-semibold transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-white/60'
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
