'use client'

import { useEffect, useState } from 'react'
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

// A live status line + optional deep-link per module, so the dashboard shows
// something the nav can't (rather than just re-listing the modules).
interface ModuleStatus {
  text: string
  href?: string
}

function Dashboard() {
  const { user, fetchWithAuth } = useAuth()
  const { t } = useLocale()
  const [statuses, setStatuses] = useState<Record<string, ModuleStatus>>({})

  // Each module's status is fetched independently and best-effort: a failure
  // (e.g. missing permission) just leaves that card as a plain link.
  useEffect(() => {
    let cancelled = false
    const setStatus = (id: string, s: ModuleStatus) =>
      !cancelled && setStatuses((prev) => ({ ...prev, [id]: s }))

    if (activeModules.some((m) => m.id === 'community')) {
      fetchWithAuth('/api/community/notices/quota')
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => {
          if (b?.data) setStatus('community', { text: t('dashboard.reportsToday', { used: String(b.data.usedToday), max: String(b.data.dailyMax) }) })
        })
        .catch(() => {})
    }

    if (activeModules.some((m) => m.id === 'adventure')) {
      fetchWithAuth('/api/adventure/games')
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => {
          const games: { session: { id: string; completedAt: string | null } | null }[] = b?.data ?? []
          const inProgress = games.find((g) => g.session && !g.session.completedAt)
          setStatus('adventure', inProgress
            ? { text: t('dashboard.resumeAdventure'), href: `/adventure/${inProgress.session!.id}` }
            : { text: t('dashboard.startAdventure') })
        })
        .catch(() => {})
    }

    if (activeModules.some((m) => m.id === 'associations')) {
      fetch('/api/associations')
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => {
          const list = b?.data?.associations ?? []
          setStatus('associations', { text: t('dashboard.associationsCount', { count: String(list.length) }) })
        })
        .catch(() => {})
    }

    return () => { cancelled = true }
  }, [fetchWithAuth, t])

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-rubik font-bold mb-6">
        {t('dashboard.welcomeBack', { name: user?.name ?? '' })}
      </h1>

      {/* Module cards — each shows a live status line the nav can't */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {activeModules.map((mod) => {
          const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[mod.navItem.icon]
          const status = statuses[mod.id]
          return (
            <Link
              key={mod.id}
              href={status?.href ?? mod.navItem.href}
              className="flex flex-col gap-2 p-5 rounded-xl border border-brand-border bg-surface hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                {IconComponent && <IconComponent className="h-6 w-6 text-brand-photinia" />}
                <span className="font-semibold">{mod.name}</span>
              </div>
              {status && <span className="text-xs text-brand-gray">{status.text}</span>}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
