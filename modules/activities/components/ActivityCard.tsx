'use client'

import { useLocale } from '@/contexts/LocaleContext'
import { getActivityCategory } from '../lib/categories'
import type { ActivityView } from '../lib/types'

// One directory card, shared by the desktop grid and the mobile carousel. A
// coloured top stripe encodes the category (the classification). Hover/focus
// activates it (pans + highlights the map pin); click opens the detail sheet.
export function ActivityCard({
  activity,
  active,
  onOpen,
  onActivate,
  className,
}: {
  activity: ActivityView
  active: boolean
  onOpen: () => void
  onActivate?: () => void
  className?: string
}) {
  const { t } = useLocale()
  const cat = getActivityCategory(activity.category)
  const subtitle = [activity.type, activity.city].filter(Boolean).join(' · ')

  return (
    <button
      onClick={onOpen}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      className={`text-left rounded-xl border bg-surface overflow-hidden transition-shadow ${active ? 'border-brand-text shadow-md' : 'border-brand-border hover:shadow-sm'} ${className ?? ''}`}
    >
      <div className="h-1.5" style={{ background: cat.color }} />
      <div className="p-3">
        <span className="inline-flex items-center gap-1 text-[10px] font-rubik font-bold" style={{ color: cat.color }}>
          <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
          {t(cat.labelKey)}
        </span>
        <p className="font-rubik font-bold text-sm text-brand-text truncate mt-0.5">{activity.name}</p>
        {subtitle && <p className="text-xs text-brand-gray truncate">{subtitle}</p>}
      </div>
    </button>
  )
}
