'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { activeModules } from '@/config/modules'
import Link from 'next/link'
import * as Icons from 'lucide-react'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}

function Dashboard() {
  const { user } = useAuth()
  const { t } = useLocale()

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-rubik font-bold mb-6">
        {t('dashboard.welcomeBack', { name: user?.name ?? '' })}
      </h1>

      {/* Module cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {activeModules.map((mod) => {
          const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[mod.navItem.icon]
          return (
            <Link
              key={mod.id}
              href={mod.navItem.href}
              className="p-5 rounded-xl border border-brand-border bg-surface hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                {IconComponent && <IconComponent className="h-6 w-6 text-brand-photinia" />}
                <span className="font-semibold">{mod.name}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
