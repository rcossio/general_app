'use client'

import { useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import { X, ImagePlus, MapPin, Loader2 } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { RichTextEditor } from '@/components/RichTextEditor'
import { memoryImageUrl } from '../lib/useMemories'
import { MAX_POST_IMAGES, type PostInput } from '../lib/schemas'
import type { MemorialPostView } from '../lib/types'

const EMPTY: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

interface PostEditorProps {
  initial?: MemorialPostView | null
  uploadImage: (file: File) => Promise<string | null>
  onSave: (payload: PostInput) => Promise<boolean>
  onCancel: () => void
}

// Add/edit one life-story post: rich text + an image carousel + a location label.
export function PostEditor({ initial, uploadImage, onSave, onCancel }: PostEditorProps) {
  const { t } = useLocale()
  const [content, setContent] = useState<JSONContent>((initial?.content as JSONContent) ?? EMPTY)
  const [images, setImages] = useState<string[]>(initial?.images ?? [])
  const [locationLabel, setLocationLabel] = useState(initial?.locationLabel ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onPickPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setUploading(true)
    setError(null)
    for (const file of files) {
      if (images.length >= MAX_POST_IMAGES) break
      const key = await uploadImage(file)
      if (key) setImages((prev) => (prev.length < MAX_POST_IMAGES ? [...prev, key] : prev))
      else setError(t('memories.saveError'))
    }
    setUploading(false)
  }

  const removeImage = (key: string) => setImages((prev) => prev.filter((k) => k !== key))

  const save = async () => {
    setSaving(true)
    setError(null)
    const ok = await onSave({
      // The editor always emits a { type: 'doc', … } document; the schema types
      // it strictly, so assert it here.
      content: content as PostInput['content'],
      images,
      locationLabel: locationLabel.trim() || undefined,
      lat: null,
      lng: null,
    })
    setSaving(false)
    if (!ok) setError(t('memories.saveError'))
  }

  return (
    <div className="rounded-2xl border border-brand-border bg-surface p-4 space-y-3">
      <p className="font-rubik font-bold text-sm">{initial ? t('memories.editPost') : t('memories.newPost')}</p>

      <div>
        <p className="text-xs font-rubik font-bold text-brand-gray mb-1">{t('memories.text')}</p>
        <RichTextEditor initialContent={content} onChange={setContent} />
      </div>

      <div>
        <p className="text-xs font-rubik font-bold text-brand-gray mb-1">{t('memories.photos')}</p>
        <div className="flex flex-wrap gap-2">
          {images.map((key) => (
            <div key={key} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- R2 thumbnail via plain <img> */}
              <img src={memoryImageUrl(key)} alt="" className="h-20 w-20 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => removeImage(key)}
                aria-label={t('common.cancel')}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-black/70 p-0.5 text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {images.length < MAX_POST_IMAGES && (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-brand-border text-brand-gray hover:bg-brand-green-light">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              <span className="text-[10px]">{t('memories.addPhotos')}</span>
              <input type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={onPickPhotos} />
            </label>
          )}
        </div>
        <p className="mt-1 text-[11px] text-brand-gray">{t('memories.photoLimit', { n: String(MAX_POST_IMAGES) })}</p>
      </div>

      <div>
        <p className="text-xs font-rubik font-bold text-brand-gray mb-1">{t('memories.location')}</p>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
          <input
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            placeholder={t('memories.locationPlaceholder')}
            maxLength={200}
            className="w-full rounded-lg border border-brand-border bg-background pl-9 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-sm text-brand-photinia">{error}</p>}

      <div className="flex gap-2">
        <button onClick={onCancel} className="px-4 py-2.5 rounded-xl border border-brand-border text-brand-text font-rubik font-bold text-sm">
          {t('common.cancel')}
        </button>
        <button onClick={save} disabled={saving || uploading} className="flex-1 px-4 py-2.5 rounded-xl bg-brand-green text-white font-rubik font-bold text-sm disabled:opacity-50">
          {saving ? t('common.saving') : t('memories.savePost')}
        </button>
      </div>
    </div>
  )
}
