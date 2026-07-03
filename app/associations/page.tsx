'use client'

import { useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Search, Globe, Facebook, Instagram, Mail, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useChrome } from '@/contexts/ChromeContext'
import { isAdminRole } from '@/lib/roles'
import { useAssociations } from '@/modules/associations/lib/useAssociations'
import { preferredContact, type AssociationView, type ContactType } from '@/modules/associations/lib/contact'
import { AssociationDetailSheet } from '@/modules/associations/components/AssociationDetailSheet'
import { AssociationFormSheet } from '@/modules/associations/components/AssociationFormSheet'
import type { AssociationInput } from '@/modules/associations/lib/schemas'

const DEFAULT_CENTER: [number, number] = [45.0118, 8.6216] // Valenza

const CONTACT_ICON: Record<ContactType, typeof Globe> = {
  website: Globe,
  facebook: Facebook,
  instagram: Instagram,
  email: Mail,
}

const AssociationsMap = dynamic(() => import('@/modules/associations/components/AssociationsMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-background flex items-center justify-center text-brand-gray text-sm">…</div>
  ),
})

export default function AssociationsPage() {
  const router = useRouter()
  const { t } = useLocale()
  const { user } = useAuth()
  const { setHideChrome } = useChrome()

  const { associations, loadError, reload, createAssociation, updateAssociation, deleteAssociation } = useAssociations()
  const [selected, setSelected] = useState<AssociationView | null>(null)
  const [query, setQuery] = useState('')
  // Admin form: null = closed, 'new' = create, otherwise the entry being edited.
  const [formTarget, setFormTarget] = useState<AssociationView | 'new' | null>(null)

  const isAdmin = isAdminRole(user?.roles)

  useEffect(() => {
    setHideChrome(true)
    return () => setHideChrome(false)
  }, [setHideChrome])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return associations
    return associations.filter(
      (a) => a.name.toLowerCase().includes(q) || (a.address?.toLowerCase().includes(q) ?? false)
    )
  }, [associations, query])

  const center = useMemo<[number, number]>(() => {
    const withCoords = associations.find((a) => a.lat != null && a.lng != null)
    return withCoords ? [withCoords.lat as number, withCoords.lng as number] : DEFAULT_CENTER
  }, [associations])

  const handleCreate = async (input: AssociationInput) => {
    const created = await createAssociation(input)
    if (created) setFormTarget(null)
    return !!created
  }

  const handleUpdate = (id: string) => async (input: AssociationInput) => {
    const updated = await updateAssociation(id, input)
    if (updated) {
      setSelected(updated)
      setFormTarget(null)
    }
    return !!updated
  }

  const handleDelete = async (a: AssociationView) => {
    if (!window.confirm(t('associations.confirmDelete', { name: a.name }))) return
    if (await deleteAssociation(a.id)) setSelected(null)
  }

  return (
    <div className="relative flex flex-col" style={{ height: '100dvh' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14 bg-brand-green text-white shrink-0 z-10">
        <button onClick={() => router.push('/dashboard')} className="p-1.5 rounded-full hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <span className="font-rubik font-bold">{t('associations.title')}</span>
        <div className="flex items-center gap-1">
          {loadError && (
            <button onClick={() => reload()} className="text-xs font-medium px-2 py-1 rounded-full bg-white/20 hover:bg-white/30">
              {t('associations.retry')}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setFormTarget('new')}
              aria-label={t('associations.addTitle')}
              className="p-1.5 rounded-full hover:bg-white/10"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs text-center border-b border-red-200 dark:border-red-800 shrink-0">
          {t('associations.loadError')}
        </div>
      )}

      {/* Map (top) — kept secondary; the searchable list below is the primary
          surface since associations are browsed mostly by name. */}
      <div className="relative overflow-hidden z-0 shrink-0" style={{ height: '32%' }}>
        <AssociationsMap
          associations={associations}
          selectedId={selected?.id ?? null}
          onSelect={(a) => setSelected(a)}
          center={center}
        />
      </div>

      {/* Searchable list (bottom) */}
      <div className="flex-1 flex flex-col min-h-0 border-t border-brand-border bg-background">
        <div className="p-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('associations.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-brand-border bg-surface text-brand-text text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-brand-gray text-center py-8">{t('associations.empty')}</p>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map((a) => {
                const pref = preferredContact(a)
                const Icon = pref ? CONTACT_ICON[pref.type] : null
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => setSelected(a)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface border border-brand-border text-left hover:shadow-sm transition-shadow"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-photinia-light text-brand-photinia shrink-0">
                        {Icon ? <Icon className="h-4 w-4" /> : <Mail className="h-4 w-4 opacity-40" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-rubik font-semibold text-sm text-brand-text truncate">{a.name}</span>
                        {a.address && <span className="block text-xs text-brand-gray truncate">{a.address}</span>}
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

      {/* Detail sheet */}
      {selected && !formTarget && (
        <AssociationDetailSheet
          association={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onEdit={() => setFormTarget(selected)}
          onDelete={() => handleDelete(selected)}
        />
      )}

      {/* Admin add/edit form */}
      {formTarget && (
        <AssociationFormSheet
          association={formTarget === 'new' ? null : formTarget}
          onCancel={() => setFormTarget(null)}
          onSubmit={formTarget === 'new' ? handleCreate : handleUpdate(formTarget.id)}
        />
      )}
    </div>
  )
}
