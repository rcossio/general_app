'use client'

import { useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { BottomSheet } from '@/components/BottomSheet'
import { ACTIVITY_CATEGORIES } from '../lib/categories'
import type { ActivityInput } from '../lib/schemas'
import type { ActivityView } from '../lib/types'

interface Props {
  activity: ActivityView | null // null = create
  onCancel: () => void
  onSubmit: (input: ActivityInput) => Promise<boolean>
}

type FormState = {
  name: string
  category: string
  type: string
  address: string
  city: string
  phone: string
  notes: string
  website: string
  facebook: string
  instagram: string
  email: string
  lat: string
  lng: string
}

function initial(a: ActivityView | null): FormState {
  return {
    name: a?.name ?? '',
    category: a?.category ?? ACTIVITY_CATEGORIES[0].key,
    type: a?.type ?? '',
    address: a?.address ?? '',
    city: a?.city ?? '',
    phone: a?.phone ?? '',
    notes: a?.notes ?? '',
    website: a?.website ?? '',
    facebook: a?.facebook ?? '',
    instagram: a?.instagram ?? '',
    email: a?.email ?? '',
    lat: a?.lat != null ? String(a.lat) : '',
    lng: a?.lng != null ? String(a.lng) : '',
  }
}

export function ActivityFormSheet({ activity, onCancel, onSubmit }: Props) {
  const { t } = useLocale()
  const [form, setForm] = useState<FormState>(() => initial(activity))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  const submit = async () => {
    if (!form.name.trim()) return setError(t('activities.nameRequired'))
    const lat = form.lat.trim() ? Number(form.lat) : null
    const lng = form.lng.trim() ? Number(form.lng) : null
    if ((lat != null && Number.isNaN(lat)) || (lng != null && Number.isNaN(lng))) return setError(t('activities.coordsInvalid'))
    setSubmitting(true)
    setError(null)
    const ok = await onSubmit({
      name: form.name.trim(),
      category: form.category,
      type: form.type.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
      website: form.website.trim() || undefined,
      facebook: form.facebook.trim() || undefined,
      instagram: form.instagram.trim() || undefined,
      email: form.email.trim() || undefined,
      taxCode: undefined, // not edited via the form; preserved on PATCH
      lat,
      lng,
    })
    setSubmitting(false)
    if (!ok) setError(t('activities.saveError'))
  }

  const cls = 'mt-1 w-full px-3 py-2 rounded-lg border border-brand-border bg-background text-brand-text text-sm'
  const field = (k: keyof FormState, labelKey: string) => (
    <label className="block">
      <span className="text-xs font-rubik font-bold text-brand-gray">{t(labelKey)}</span>
      <input value={form[k]} onChange={set(k)} className={cls} />
    </label>
  )

  return (
    <BottomSheet onClose={onCancel} zIndex={2100} maxHeight="88vh">
      <div className="w-10 h-1 bg-brand-border rounded-full mx-auto mb-4" />
      <p className="font-rubik font-bold text-base mb-4">
        {activity ? t('activities.editTitle') : t('activities.addTitle')}
      </p>

      <div className="space-y-3">
        {field('name', 'activities.field.name')}
        <label className="block">
          <span className="text-xs font-rubik font-bold text-brand-gray">{t('activities.field.category')}</span>
          <select value={form.category} onChange={set('category')} className={cls}>
            {ACTIVITY_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{t(c.labelKey)}</option>
            ))}
          </select>
        </label>
        {field('type', 'activities.field.type')}
        {field('address', 'activities.field.address')}
        {field('city', 'activities.field.city')}
        {field('phone', 'activities.field.phone')}
        {field('website', 'activities.field.website')}
        {field('facebook', 'activities.field.facebook')}
        {field('instagram', 'activities.field.instagram')}
        {field('email', 'activities.field.email')}
        <label className="block">
          <span className="text-xs font-rubik font-bold text-brand-gray">{t('activities.field.notes')}</span>
          <textarea value={form.notes} onChange={set('notes')} rows={2} className={cls} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          {field('lat', 'activities.field.lat')}
          {field('lng', 'activities.field.lng')}
        </div>
      </div>

      {error && <p className="text-sm text-brand-photinia mt-3">{error}</p>}

      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="px-4 py-2.5 rounded-xl border border-brand-border text-brand-text font-rubik font-bold text-sm">
          {t('common.cancel')}
        </button>
        <button onClick={submit} disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl bg-brand-green text-white font-rubik font-bold text-sm disabled:opacity-50">
          {submitting ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </BottomSheet>
  )
}
