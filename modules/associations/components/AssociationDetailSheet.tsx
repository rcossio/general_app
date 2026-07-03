'use client'

import { Globe, Facebook, Instagram, Mail, Phone, MapPin, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { preferredContact, type AssociationView, type ContactType } from '../lib/contact'

const CONTACT_ICON: Record<ContactType | 'phone', typeof Globe> = {
  website: Globe,
  facebook: Facebook,
  instagram: Instagram,
  email: Mail,
  phone: Phone,
}

interface AssociationDetailSheetProps {
  association: AssociationView
  isAdmin: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

// Bottom sheet for a selected association: name, address, and contact channels.
// The preferred channel (website > facebook > instagram > email) is the primary
// button; any other channels appear as secondary links.
export function AssociationDetailSheet({ association, isAdmin, onClose, onEdit, onDelete }: AssociationDetailSheetProps) {
  const { t } = useLocale()
  const preferred = preferredContact(association)

  // Secondary channels = every present contact except the preferred one.
  const secondary: { type: ContactType; value: string; href: string }[] = []
  if (association.website && preferred?.type !== 'website')
    secondary.push({ type: 'website', value: association.website, href: association.website })
  if (association.facebook && preferred?.type !== 'facebook')
    secondary.push({ type: 'facebook', value: association.facebook, href: association.facebook })
  if (association.instagram && preferred?.type !== 'instagram')
    secondary.push({ type: 'instagram', value: association.instagram, href: association.instagram })
  if (association.email && preferred?.type !== 'email')
    secondary.push({ type: 'email', value: association.email, href: `mailto:${association.email}` })

  const PreferredIcon = preferred ? CONTACT_ICON[preferred.type] : null
  const mapsUrl =
    association.lat != null && association.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${association.lat},${association.lng}`
      : null

  return (
    <div className="absolute inset-0 z-[2000] flex items-end" onClick={onClose}>
      <div
        className="w-full bg-surface rounded-t-2xl shadow-2xl border-t border-brand-border p-5 pb-8 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-brand-border rounded-full mx-auto mb-4" />

        <div className="flex items-start gap-3 mb-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-photinia-light text-brand-photinia shrink-0">
            <MapPin className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-rubik font-bold text-base leading-tight">{association.name}</p>
            {association.address && (
              <p className="text-xs text-brand-gray mt-0.5">{association.address}</p>
            )}
          </div>
        </div>

        {association.description && (
          <p className="text-sm text-brand-text leading-relaxed mb-4">{association.description}</p>
        )}

        {/* Preferred contact — primary call to action */}
        {preferred && PreferredIcon ? (
          <a
            href={preferred.href}
            target={preferred.type === 'email' ? undefined : '_blank'}
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-green text-white font-rubik font-bold text-sm mb-2"
          >
            <PreferredIcon className="h-4 w-4" strokeWidth={2.5} />
            {t(preferred.labelKey)}
          </a>
        ) : (
          <p className="text-sm text-brand-gray text-center py-2 mb-2">{t('associations.noContact')}</p>
        )}

        {/* Secondary channels + phone + directions */}
        <div className="flex flex-wrap gap-2">
          {secondary.map((c) => {
            const Icon = CONTACT_ICON[c.type]
            return (
              <a
                key={c.type}
                href={c.href}
                target={c.type === 'email' ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-border text-brand-text font-rubik font-bold text-xs"
              >
                <Icon className="h-4 w-4" strokeWidth={2.5} />
                {t(`associations.contact.${c.type}`)}
              </a>
            )
          })}
          {association.phone && (
            <a
              href={`tel:${association.phone.replace(/\s+/g, '')}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-border text-brand-text font-rubik font-bold text-xs"
            >
              <Phone className="h-4 w-4" strokeWidth={2.5} />
              {association.phone}
            </a>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-border text-brand-text font-rubik font-bold text-xs"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={2.5} />
              {t('associations.directions')}
            </a>
          )}
        </div>

        {/* Admin controls */}
        {isAdmin && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-brand-border">
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-brand-border text-brand-text font-rubik font-bold text-sm"
            >
              <Pencil className="h-4 w-4" strokeWidth={2.5} /> {t('associations.edit')}
            </button>
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-brand-border text-brand-photinia font-rubik font-bold text-sm"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.5} /> {t('associations.delete')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
