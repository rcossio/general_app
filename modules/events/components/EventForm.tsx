'use client'

import { useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import { X, ImagePlus, MapPin, Loader2 } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { RichTextEditor } from '@/components/RichTextEditor'
import { EVENT_TYPES } from '../lib/categories'
import { MAX_EVENT_IMAGES, type EventInput } from '../lib/schemas'
import { eventImageUrl } from '../lib/useEvents'
import type { EventView } from '../lib/types'

const EMPTY: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

// ISO -> value for <input type="datetime-local"> in the browser's local time.
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface EventFormProps {
  initial?: EventView | null
  uploadImage: (file: File) => Promise<string | null>
  onSubmit: (input: EventInput) => Promise<boolean>
  submitLabel: string
}

export function EventForm({ initial, uploadImage, onSubmit, submitLabel }: EventFormProps) {
  const { t } = useLocale()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [type, setType] = useState(initial?.type ?? EVENT_TYPES[0].key)
  const [content, setContent] = useState<JSONContent>((initial?.content as JSONContent) ?? EMPTY)
  const [images, setImages] = useState<string[]>(initial?.images ?? [])
  const [startAt, setStartAt] = useState(toLocalInput(initial?.startAt ?? null))
  const [endAt, setEndAt] = useState(toLocalInput(initial?.endAt ?? null))
  const [locationLabel, setLocationLabel] = useState(initial?.locationLabel ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onPickPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    setError(null)
    for (const file of files) {
      if (images.length >= MAX_EVENT_IMAGES) break
      const key = await uploadImage(file)
      if (key) setImages((prev) => (prev.length < MAX_EVENT_IMAGES ? [...prev, key] : prev))
      else setError(t('events.saveError'))
    }
    setUploading(false)
  }

  const submit = async () => {
    if (!title.trim()) return setError(t('events.titleRequired'))
    if (!startAt) return setError(t('events.saveError'))
    setSaving(true)
    setError(null)
    const ok = await onSubmit({
      title: title.trim(),
      type,
      content: content as EventInput['content'],
      images,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      locationLabel: locationLabel.trim() || undefined,
      lat: null,
      lng: null,
    })
    setSaving(false)
    if (!ok) setError(t('events.saveError'))
  }

  const inputCls = 'w-full rounded-lg border border-brand-border bg-background px-3 py-2 text-sm'

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-rubik font-bold text-brand-gray mb-1">{t('events.eventTitle')}</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder={t('events.titlePlaceholder')} className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-rubik font-bold text-brand-gray mb-1">{t('events.typeLabel')}</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
            {EVENT_TYPES.map((tp) => (
              <option key={tp.key} value={tp.key}>{t(tp.labelKey)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-rubik font-bold text-brand-gray mb-1">{t('events.startAt')}</label>
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-rubik font-bold text-brand-gray mb-1">{t('events.endAt')}</label>
        <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className="block text-xs font-rubik font-bold text-brand-gray mb-1">{t('events.location')}</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
          <input value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} maxLength={200} placeholder={t('events.locationPlaceholder')} className={`${inputCls} pl-9`} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-rubik font-bold text-brand-gray mb-1">{t('events.text')}</label>
        <RichTextEditor initialContent={content} onChange={setContent} />
      </div>

      <div>
        <label className="block text-xs font-rubik font-bold text-brand-gray mb-1">{t('events.photos')}</label>
        <div className="flex flex-wrap gap-2">
          {images.map((key) => (
            <div key={key} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- R2 thumbnail via plain <img> */}
              <img src={eventImageUrl(key)} alt="" className="h-20 w-20 rounded-lg object-cover" />
              <button type="button" onClick={() => setImages((p) => p.filter((k) => k !== key))} aria-label={t('common.cancel')} className="absolute -right-1.5 -top-1.5 rounded-full bg-black/70 p-0.5 text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {images.length < MAX_EVENT_IMAGES && (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-brand-border text-brand-gray hover:bg-brand-green-light">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              <span className="text-[10px]">{t('events.addPhotos')}</span>
              <input type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={onPickPhotos} />
            </label>
          )}
        </div>
        <p className="mt-1 text-[11px] text-brand-gray">{t('events.photoLimit', { n: String(MAX_EVENT_IMAGES) })}</p>
      </div>

      {error && <p className="text-sm text-brand-photinia">{error}</p>}

      <button onClick={submit} disabled={saving || uploading} className="w-full px-4 py-3 rounded-xl bg-brand-green text-white font-rubik font-bold text-sm disabled:opacity-50">
        {saving ? t('events.saving') : submitLabel}
      </button>
    </div>
  )
}
