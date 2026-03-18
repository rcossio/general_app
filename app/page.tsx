'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { activeModules } from '@/config/modules'
import Link from 'next/link'
import * as Icons from 'lucide-react'
import { useEffect, useState } from 'react'

interface TrackerEntry {
  id: string
  type: string
  title: string
  score: number
  createdAt: string
}

interface WorkoutRoutine {
  id: string
  name: string
  description: string | null
  updatedAt: string
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}

function Dashboard() {
  const { user, fetchWithAuth } = useAuth()
  const { t } = useLocale()
  const [recentEntries, setRecentEntries] = useState<TrackerEntry[]>([])
  const [recentRoutines, setRecentRoutines] = useState<WorkoutRoutine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchWithAuth('/api/tracker/entries?limit=3').then((r) => r.json()),
      fetchWithAuth('/api/workout/routines?limit=3').then((r) => r.json()),
    ])
      .then(([tracker, workout]) => {
        setRecentEntries(tracker.data?.entries ?? [])
        setRecentRoutines(workout.data?.routines ?? [])
      })
      .finally(() => setLoading(false))
  }, [fetchWithAuth])

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">
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
              className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                {IconComponent && <IconComponent className="h-6 w-6 text-blue-600" />}
                <span className="font-semibold">{mod.name}</span>
              </div>
            </Link>
          )
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Routines */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">{t('dashboard.recentWorkouts')}</h2>
              <Link href="/workout" className="text-sm text-blue-600 hover:underline">{t('common.viewAll')}</Link>
            </div>
            {recentRoutines.length === 0 ? (
              <p className="text-sm text-gray-500">{t('dashboard.noRoutinesYet')}</p>
            ) : (
              <ul className="space-y-2">
                {recentRoutines.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/workout/${r.id}`}
                      className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-sm transition-shadow"
                    >
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-gray-500">{new Date(r.updatedAt).toLocaleDateString()}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent Tracker Entries */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">{t('dashboard.recentEntries')}</h2>
              <Link href="/tracker" className="text-sm text-blue-600 hover:underline">{t('common.viewAll')}</Link>
            </div>
            {recentEntries.length === 0 ? (
              <p className="text-sm text-gray-500">{t('common.noEntriesYet')}</p>
            ) : (
              <ul className="space-y-2">
                {recentEntries.map((e) => (
                  <li key={e.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <div className="flex justify-between items-start">
                      <p className="font-medium">{e.title}</p>
                      <span className="text-sm font-semibold text-blue-600">{e.score}/10</span>
                    </div>
                    <p className="text-xs text-gray-500">{e.type} · {new Date(e.createdAt).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
