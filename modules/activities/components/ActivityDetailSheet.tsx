'use client'

import { Phone, ExternalLink, Pencil, Trash2, Globe, Facebook, Instagram, Mail } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { BottomSheet } from '@/components/BottomSheet'
import { getActivityCategory } from '../lib/categories'
import { preferredContact, type ContactType } from '../lib/contact'
import type { ActivityView } from '../lib/types'

const CONTACT_ICON: Record<ContactType, typeof Globe> = {
  website: Globe,
  facebook: Facebook,
  instagram: Instagram,
  email: Mail,
}

interface Props {
  activity: ActivityView
  isAdmin: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ActivityDetailSheet({ activity, isAdmin, onClose, onEdit, onDelete }: Props) {
  const { t } = useLocale()
  const cat = getActivityCategory(activity.category)
  const preferred = preferredContact(activity)
  const PreferredIcon = preferred ? CONTACT_ICON[preferred.type] : null

  // Other contact channels beyond the preferred one.
  const secondary: { type: ContactType; href: string }[] = []
  if (activity.website && preferred?.type !== 'website') secondary.push({ type: 'website', href: activity.website })
  if (activity.facebook && preferred?.type !== 'facebook') secondary.push({ type: 'facebook', href: activity.facebook })
  if (activity.instagram && preferred?.type !== 'instagram') secondary.push({ type: 'instagram', href: activity.instagram })
  if (activity.email && preferred?.type !== 'email') secondary.push({ type: 'email', href: `mailto:${activity.email}` })

  const mapsUrl =
    activity.lat != null && activity.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${activity.lat},${activity.lng}`
      : activity.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activity.address} ${activity.city ?? ''}`)}`
        : null

  const pill = 'flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-border text-brand-text font-rubik font-bold text-xs'

  return (
    <BottomSheet onClose={onClose} maxHeight="80vh">
      <div className="w-10 h-1 bg-brand-border rounded-full mx-auto mb-4" />

      <div className="flex items-start gap-3 mb-3">
        <span className="mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-white shadow" style={{ background: cat.color }} />
        <div className="min-w-0">
          <p className="font-rubik font-bold text-base leading-tight">{activity.name}</p>
          <p className="text-xs text-brand-gray mt-0.5">
            <span style={{ color: cat.color }} className="font-rubik font-bold">{t(cat.labelKey)}</span>
            {activity.type && <> · {activity.type}</>}
          </p>
          {activity.address && (
            <p className="text-xs text-brand-gray mt-0.5">{activity.address}{activity.city ? `, ${activity.city}` : ''}</p>
          )}
        </div>
      </div>

      {activity.notes && <p className="text-sm text-brand-text leading-relaxed mb-4">{activity.notes}</p>}

      {preferred && PreferredIcon && (
        <a
          href={preferred.href}
          target={preferred.type === 'email' ? undefined : '_blank'}
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-green text-white font-rubik font-bold text-sm mb-2"
        >
          <PreferredIcon className="h-4 w-4" strokeWidth={2.5} /> {t(preferred.labelKey)}
        </a>
      )}

      <div className="flex flex-wrap gap-2">
        {secondary.map((c) => {
          const Icon = CONTACT_ICON[c.type]
          return (
            <a key={c.type} href={c.href} target={c.type === 'email' ? undefined : '_blank'} rel="noopener noreferrer" className={pill}>
              <Icon className="h-4 w-4" strokeWidth={2.5} /> {t(`activities.contact.${c.type}`)}
            </a>
          )
        })}
        {activity.phone && (
          <a href={`tel:${activity.phone.replace(/\s+/g, '')}`} className={pill}>
            <Phone className="h-4 w-4" strokeWidth={2.5} /> {t('activities.call')}
          </a>
        )}
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={pill}>
            <ExternalLink className="h-4 w-4" strokeWidth={2.5} /> {t('activities.directions')}
          </a>
        )}
      </div>

      {isAdmin && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-brand-border">
          <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-brand-border text-brand-text font-rubik font-bold text-sm">
            <Pencil className="h-4 w-4" strokeWidth={2.5} /> {t('activities.edit')}
          </button>
          <button onClick={onDelete} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-brand-border text-brand-photinia font-rubik font-bold text-sm">
            <Trash2 className="h-4 w-4" strokeWidth={2.5} /> {t('activities.delete')}
          </button>
        </div>
      )}
    </BottomSheet>
  )
}
