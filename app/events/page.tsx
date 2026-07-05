'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as Icons from 'lucide-react'
import { Plus, CalendarDays, MapPin } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useEventsFeed, eventImageUrl } from '@/modules/events/lib/useEvents'
import { getEventType } from '@/modules/events/lib/categories'

export default function EventsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { t, locale } = useLocale()
  const { events, quota, loading, loadError, requestMore } = useEventsFeed()
  const [requesting, setRequesting] = useState(false)

  const fmtWhen = (iso: string) =>
    new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })

  const onRequestMore = async () => {
    const message = window.prompt(t('events.requestPlaceholder')) ?? ''
    setRequesting(true)
    await requestMore(message)
    setRequesting(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-rubik font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-brand-photinia" /> {t('events.title')}
        </h1>
        {user && quota && (
          quota.canPost ? (
            <button onClick={() => router.push('/events/new')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-green text-white font-rubik font-bold text-sm">
              <Plus className="h-4 w-4" strokeWidth={2.5} /> {t('events.create')}
            </button>
          ) : quota.hasPendingRequest ? (
            <span className="text-xs text-brand-gray">{t('events.requestPending')}</span>
          ) : (
            <button onClick={onRequestMore} disabled={requesting} className="text-xs font-rubik font-bold text-brand-green disabled:opacity-50">
              {t('events.requestMore')}
            </button>
          )
        )}
      </div>

      {user && quota && (
        <p className="text-xs text-brand-gray mb-4">
          {quota.weeklyMax === null
            ? t('events.unlimited')
            : t('events.quotaUsed', { used: String(quota.usedThisWeek), max: String(quota.weeklyMax) })}
          {!quota.canPost && quota.weeklyMax !== null && ` · ${t('events.capReached', { max: String(quota.weeklyMax) })}`}
        </p>
      )}

      {loadError && <p className="text-sm text-brand-photinia mb-3">{t('events.loadError')}</p>}

      {loading ? (
        <p className="text-sm text-brand-gray">{t('common.loading')}</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-brand-gray text-center py-10">{t('events.empty')}</p>
      ) : (
        <ul className="space-y-2.5">
          {events.map((ev) => {
            const cat = getEventType(ev.type)
            const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[cat.icon] ?? CalendarDays
            return (
              <li key={ev.id}>
                <Link href={`/events/${ev.id}`} className="flex gap-3 rounded-2xl border border-brand-border bg-surface overflow-hidden hover:shadow-md transition-shadow">
                  {ev.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- R2 thumbnail via plain <img>
                    <img src={eventImageUrl(ev.image)} alt="" className="h-24 w-24 shrink-0 object-cover" />
                  ) : (
                    <span className="flex h-24 w-24 shrink-0 items-center justify-center bg-brand-photinia-light text-brand-photinia">
                      <Icon className="h-7 w-7" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1 py-2.5 pr-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-light px-2 py-0.5 text-[10px] font-rubik font-bold text-brand-green">
                      <Icon className="h-3 w-3" /> {t(cat.labelKey)}
                    </span>
                    <p className="mt-1 font-rubik font-bold text-sm text-brand-text truncate">{ev.title}</p>
                    <p className="text-xs text-brand-gray">{fmtWhen(ev.startAt)}</p>
                    {ev.locationLabel && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-brand-gray truncate">
                        <MapPin className="h-3 w-3 shrink-0" /> {ev.locationLabel}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
