'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, Plus, Search, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useChrome } from '@/contexts/ChromeContext'
import { isAdminRole } from '@/lib/roles'
import { useActivities } from '@/modules/activities/lib/useActivities'
import { ACTIVITY_CATEGORIES, getActivityCategory } from '@/modules/activities/lib/categories'
import { ActivityDetailSheet } from '@/modules/activities/components/ActivityDetailSheet'
import { ActivityFormSheet } from '@/modules/activities/components/ActivityFormSheet'
import type { ActivityView } from '@/modules/activities/lib/types'
import type { ActivityInput } from '@/modules/activities/lib/schemas'

const DEFAULT_CENTER: [number, number] = [45.0118, 8.6216] // Valenza

const ActivitiesMap = dynamic(() => import('@/modules/activities/components/ActivitiesMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-background flex items-center justify-center text-brand-gray text-sm">…</div>,
})

export default function ActivitiesPage() {
  const router = useRouter()
  const { t } = useLocale()
  const { user } = useAuth()
  const { setHideChrome } = useChrome()
  const { activities, loadError, reload, createActivity, updateActivity, deleteActivity } = useActivities()

  const [selected, setSelected] = useState<ActivityView | null>(null)
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [formTarget, setFormTarget] = useState<ActivityView | 'new' | null>(null)

  const isAdmin = isAdminRole(user?.roles)

  useEffect(() => {
    setHideChrome(true)
    return () => setHideChrome(false)
  }, [setHideChrome])

  // Only categories actually present, for the legend/filter.
  const presentCategories = useMemo(() => {
    const keys = new Set(activities.map((a) => a.category))
    return ACTIVITY_CATEGORIES.filter((c) => keys.has(c.key))
  }, [activities])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return activities.filter((a) => {
      if (catFilter && a.category !== catFilter) return false
      if (!q) return true
      return (
        a.name.toLowerCase().includes(q) ||
        (a.type?.toLowerCase().includes(q) ?? false) ||
        (a.address?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [activities, query, catFilter])

  const center = useMemo<[number, number]>(() => {
    const withCoords = activities.find((a) => a.lat != null && a.lng != null)
    return withCoords ? [withCoords.lat as number, withCoords.lng as number] : DEFAULT_CENTER
  }, [activities])

  const handleCreate = async (input: ActivityInput) => {
    const created = await createActivity(input)
    if (created) setFormTarget(null)
    return !!created
  }
  const handleUpdate = (id: string) => async (input: ActivityInput) => {
    const updated = await updateActivity(id, input)
    if (updated) { setSelected(updated); setFormTarget(null) }
    return !!updated
  }
  const handleDelete = async (a: ActivityView) => {
    if (!window.confirm(t('activities.confirmDelete', { name: a.name }))) return
    if (await deleteActivity(a.id)) setSelected(null)
  }

  return (
    <div className="relative flex flex-col" style={{ height: '100dvh' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14 bg-brand-green text-white shrink-0 z-10">
        <button onClick={() => router.push('/dashboard')} className="p-1.5 rounded-full hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <span className="font-rubik font-bold">{t('activities.title')}</span>
        <div className="flex items-center gap-1">
          {loadError && (
            <button onClick={() => reload()} className="text-xs font-medium px-2 py-1 rounded-full bg-white/20 hover:bg-white/30">
              {t('activities.retry')}
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setFormTarget('new')} aria-label={t('activities.addTitle')} className="p-1.5 rounded-full hover:bg-white/10">
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs text-center border-b border-red-200 dark:border-red-800 shrink-0">
          {t('activities.loadError')}
        </div>
      )}

      {/* Map */}
      <div className="relative overflow-hidden z-0 shrink-0" style={{ height: '38%' }}>
        <ActivitiesMap activities={filtered} selectedId={selected?.id ?? null} onSelect={(a) => setSelected(a)} center={center} />
      </div>

      {/* Category legend / filter */}
      <div className="shrink-0 border-t border-brand-border bg-background px-2 py-2 overflow-x-auto">
        <div className="flex gap-1.5 w-max">
          {presentCategories.map((c) => {
            const active = catFilter === c.key
            return (
              <button
                key={c.key}
                onClick={() => setCatFilter(active ? null : c.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-rubik font-bold whitespace-nowrap ${active ? 'border-brand-text bg-surface' : 'border-brand-border text-brand-gray'}`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                {t(c.labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search + list */}
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <div className="p-3 pt-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('activities.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-brand-border bg-surface text-brand-text text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-brand-gray text-center py-8">{t('activities.empty')}</p>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map((a) => {
                const cat = getActivityCategory(a.category)
                return (
                  <li key={a.id}>
                    <button onClick={() => setSelected(a)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface border border-brand-border text-left hover:shadow-sm transition-shadow">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: cat.color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-rubik font-semibold text-sm text-brand-text truncate">{a.name}</span>
                        <span className="block text-xs text-brand-gray truncate">{a.type || t(cat.labelKey)}{a.city ? ` · ${a.city}` : ''}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-brand-gray shrink-0" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {selected && !formTarget && (
        <ActivityDetailSheet
          activity={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onEdit={() => setFormTarget(selected)}
          onDelete={() => handleDelete(selected)}
        />
      )}

      {formTarget && (
        <ActivityFormSheet
          activity={formTarget === 'new' ? null : formTarget}
          onCancel={() => setFormTarget(null)}
          onSubmit={formTarget === 'new' ? handleCreate : handleUpdate(formTarget.id)}
        />
      )}
    </div>
  )
}
