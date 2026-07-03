'use client'

import { useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import type { AssociationView } from '../lib/contact'
import type { AssociationInput } from '../lib/schemas'

interface AssociationFormSheetProps {
  // The association being edited, or null when creating a new one.
  association: AssociationView | null
  onCancel: () => void
  onSubmit: (input: AssociationInput) => Promise<boolean>
}

type FormState = {
  name: string
  description: string
  website: string
  facebook: string
  instagram: string
  email: string
  phone: string
  address: string
  lat: string
  lng: string
}

function initialState(a: AssociationView | null): FormState {
  return {
    name: a?.name ?? '',
    description: a?.description ?? '',
    website: a?.website ?? '',
    facebook: a?.facebook ?? '',
    instagram: a?.instagram ?? '',
    email: a?.email ?? '',
    phone: a?.phone ?? '',
    address: a?.address ?? '',
    lat: a?.lat != null ? String(a.lat) : '',
    lng: a?.lng != null ? String(a.lng) : '',
  }
}

// Admin bottom sheet to create or edit a directory entry.
export function AssociationFormSheet({ association, onCancel, onSubmit }: AssociationFormSheetProps) {
  const { t } = useLocale()
  const [form, setForm] = useState<FormState>(() => initialState(association))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const submit = async () => {
    if (!form.name.trim()) {
      setError(t('associations.nameRequired'))
      return
    }
    const lat = form.lat.trim() ? Number(form.lat) : null
    const lng = form.lng.trim() ? Number(form.lng) : null
    if ((lat != null && Number.isNaN(lat)) || (lng != null && Number.isNaN(lng))) {
      setError(t('associations.coordsInvalid'))
      return
    }
    setSubmitting(true)
    setError(null)
    const ok = await onSubmit({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      website: form.website.trim() || undefined,
      facebook: form.facebook.trim() || undefined,
      instagram: form.instagram.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      lat,
      lng,
    })
    setSubmitting(false)
    if (!ok) setError(t('associations.saveError'))
  }

  const field = (key: keyof FormState, labelKey: string, type = 'text', placeholder = '') => (
    <label className="block">
      <span className="text-xs font-rubik font-bold text-brand-gray">{t(labelKey)}</span>
      <input
        type={type}
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 rounded-lg border border-brand-border bg-background text-brand-text text-sm"
      />
    </label>
  )

  return (
    <div className="absolute inset-0 z-[2100] flex items-end" onClick={onCancel}>
      <div
        className="w-full bg-surface rounded-t-2xl shadow-2xl border-t border-brand-border p-5 pb-8 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-brand-border rounded-full mx-auto mb-4" />
        <p className="font-rubik font-bold text-base mb-4">
          {association ? t('associations.editTitle') : t('associations.addTitle')}
        </p>

        <div className="space-y-3">
          {field('name', 'associations.field.name')}
          <label className="block">
            <span className="text-xs font-rubik font-bold text-brand-gray">{t('associations.field.description')}</span>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-brand-border bg-background text-brand-text text-sm"
            />
          </label>
          {field('website', 'associations.field.website', 'url', 'https://')}
          {field('facebook', 'associations.field.facebook', 'url', 'https://')}
          {field('instagram', 'associations.field.instagram', 'url', 'https://')}
          {field('email', 'associations.field.email', 'email')}
          {field('phone', 'associations.field.phone')}
          {field('address', 'associations.field.address')}
          <div className="grid grid-cols-2 gap-3">
            {field('lat', 'associations.field.lat')}
            {field('lng', 'associations.field.lng')}
          </div>
        </div>

        {error && <p className="text-sm text-brand-photinia mt-3">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-brand-border text-brand-text font-rubik font-bold text-sm"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-green text-white font-rubik font-bold text-sm disabled:opacity-50"
          >
            {submitting ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
