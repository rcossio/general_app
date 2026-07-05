'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, Plus, Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useChrome } from '@/contexts/ChromeContext'
import { isAdminRole } from '@/lib/roles'
import { useActivities } from '@/modules/activities/lib/useActivities'
import { ACTIVITY_CATEGORIES } from '@/modules/activities/lib/categories'
import { ActivityCard } from '@/modules/activities/components/ActivityCard'
import { ActivityDetailSheet } from '@/modules/activities/components/ActivityDetailSheet'
import { ActivityFormSheet } from '@/modules/activities/components/ActivityFormSheet'
import type { ActivityView } from '@/modules/activities/lib/types'
import type { ActivityInput } from '@/modules/activities/lib/schemas'

const DEFAULT_CENTER: [number, number] = [45.0118, 8.6216] // Valenza

const ActivitiesMap = dynamic(() => import('@/modules/activities/components/ActivitiesMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-background flex items-center justify-center text-brand-gray text-sm">…</div>,
})

const noScrollbar = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export default function ActivitiesPage() {
  const router = useRouter()
  const { t } = useLocale()
  const { user } = useAuth()
  const { setHideChrome } = useChrome()
  const { activities, loadError, reload, createActivity, updateActivity, deleteActivity } = useActivities()

  const [detail, setDetail] = useState<ActivityView | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null) // highlighted pin / card
  const [panId, setPanId] = useState<string | null>(null) // map pan target
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [formTarget, setFormTarget] = useState<ActivityView | 'new' | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  const isAdmin = isAdminRole(user?.roles)

  useEffect(() => {
    setHideChrome(true)
    return () => setHideChrome(false)
  }, [setHideChrome])

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

  // Open the detail sheet + centre the map on it.
  const open = (a: ActivityView) => {
    setActiveId(a.id)
    setPanId(a.id)
    setDetail(a)
  }
  // Hover/focus (desktop): highlight the pin without panning.
  const highlight = (id: string) => setActiveId(id)

  // Swiping the mobile carousel pans the map to the centred card.
  const onCarouselScroll = () => {
    const el = carouselRef.current
    if (!el || filtered.length === 0) return
    const first = el.firstElementChild as HTMLElement | null
    const cardW = first ? first.offsetWidth : el.clientWidth
    const idx = Math.min(filtered.length - 1, Math.max(0, Math.round(el.scrollLeft / (cardW + 12))))
    const a = filtered[idx]
    if (a && a.id !== activeId) {
      setActiveId(a.id)
      setPanId(a.id)
    }
  }

  const handleCreate = async (input: ActivityInput) => {
    const created = await createActivity(input)
    if (created) setFormTarget(null)
    return !!created
  }
  const handleUpdate = (id: string) => async (input: ActivityInput) => {
    const updated = await updateActivity(id, input)
    if (updated) { setDetail(updated); setFormTarget(null) }
    return !!updated
  }
  const handleDelete = async (a: ActivityView) => {
    if (!window.confirm(t('activities.confirmDelete', { name: a.name }))) return
    if (await deleteActivity(a.id)) setDetail(null)
  }

  const searchInput = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('activities.searchPlaceholder')}
        className="w-full pl-9 pr-3 py-2 rounded-lg border border-brand-border bg-surface text-brand-text text-sm shadow-sm"
      />
    </div>
  )

  const chips = (
    <div className={`flex gap-1.5 overflow-x-auto ${noScrollbar}`}>
      {presentCategories.map((c) => {
        const active = catFilter === c.key
        return (
          <button
            key={c.key}
            onClick={() => setCatFilter(active ? null : c.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-rubik font-bold whitespace-nowrap shadow-sm ${active ? 'border-brand-text bg-surface' : 'border-brand-border bg-surface/90 text-brand-gray'}`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
            {t(c.labelKey)}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="relative flex flex-col" style={{ height: '100dvh' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14 bg-brand-green text-white shrink-0 z-20">
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

      <div className="relative flex-1 min-h-0 md:flex">
        {/* Desktop: left results panel with a card grid */}
        <aside className="hidden md:flex md:flex-col md:w-[440px] md:shrink-0 md:h-full md:border-r md:border-brand-border md:bg-background">
          <div className="p-3 space-y-2 shrink-0">
            {searchInput}
            {chips}
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {filtered.length === 0 ? (
              <p className="text-sm text-brand-gray text-center py-8">{t('activities.empty')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filtered.map((a) => (
                  <ActivityCard key={a.id} activity={a} active={activeId === a.id} onOpen={() => open(a)} onActivate={() => highlight(a.id)} />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Map: full-bleed behind on mobile, large right pane on desktop */}
        <div className="absolute inset-0 md:static md:flex-1 md:h-full">
          <ActivitiesMap
            activities={filtered}
            selectedId={activeId}
            panToId={panId}
            onSelect={(a) => open(a)}
            center={center}
            fitKey={catFilter ?? 'all'}
          />

          {/* Mobile: floating search + filters over the map */}
          <div className="md:hidden absolute top-2 left-2 right-2 z-[1000] space-y-2">
            {searchInput}
            {chips}
          </div>

          {/* Mobile: swipeable card carousel synced to the map */}
          {filtered.length > 0 && (
            <div
              ref={carouselRef}
              onScroll={onCarouselScroll}
              className={`md:hidden absolute bottom-3 left-0 right-0 z-[1000] flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 ${noScrollbar}`}
            >
              {filtered.map((a) => (
                <ActivityCard
                  key={a.id}
                  activity={a}
                  active={activeId === a.id}
                  onOpen={() => open(a)}
                  className="snap-center shrink-0 w-[78%] shadow-lg"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {detail && !formTarget && (
        <ActivityDetailSheet
          activity={detail}
          isAdmin={isAdmin}
          onClose={() => setDetail(null)}
          onEdit={() => setFormTarget(detail)}
          onDelete={() => handleDelete(detail)}
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
