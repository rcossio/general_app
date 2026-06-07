'use client'

import type { ChangeEvent } from 'react'
import { ArrowLeft, X, Camera } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { NOTICE_CATEGORIES } from '@/modules/community/lib/categories'
import { getIconComponent } from '@/modules/community/lib/icon'

interface ReportFormSheetProps {
  category: string | null
  setCategory: (key: string) => void
  note: string
  setNote: (value: string) => void
  photo: { file: File; preview: string } | null
  onPickPhoto: (e: ChangeEvent<HTMLInputElement>) => void
  onRemovePhoto: () => void
  submit: () => void
  submitting: boolean
  errorMsg: string | null
  onBack: () => void
  onCancel: () => void
}

// Step 2 of the report flow: pick a category, optional note, required photo, send.
export function ReportFormSheet({
  category,
  setCategory,
  note,
  setNote,
  photo,
  onPickPhoto,
  onRemovePhoto,
  submit,
  submitting,
  errorMsg,
  onBack,
  onCancel,
}: ReportFormSheetProps) {
  const { t } = useLocale()
  return (
    <div className="absolute inset-x-0 bottom-0 z-[2000]">
      <div className="w-full bg-surface rounded-t-2xl shadow-2xl border-t border-brand-border p-5 pb-8 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="p-1.5 rounded-full hover:bg-brand-green-light text-brand-gray" aria-label={t('common.cancel')}>
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <h2 className="font-rubik font-bold text-base">{t('community.reportProblem')}</h2>
          <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-brand-green-light text-brand-gray">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs font-rubik font-bold text-brand-gray mb-2">{t('community.chooseCategory')}</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {NOTICE_CATEGORIES.map((c) => {
            const Icon = getIconComponent(c.icon)
            const active = category === c.key
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-colors ${active ? 'border-brand-green bg-brand-green-light text-brand-green' : 'border-brand-border text-brand-text hover:bg-brand-green-light'}`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-[11px] font-medium leading-tight">{t(c.labelKey)}</span>
              </button>
            )
          })}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={280}
          rows={2}
          placeholder={category === 'other' ? t('community.noteRequired') : t('community.noteOptional')}
          className="w-full rounded-xl border border-brand-border bg-background px-3 py-2 text-sm mb-3 resize-none"
        />

        {photo ? (
          <div className="relative mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object-URL preview of the user's photo; next/image not used here */}
            <img src={photo.preview} alt="" className="w-full rounded-xl max-h-48 object-cover" />
            <button onClick={onRemovePhoto} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 px-4 py-2.5 mb-3 rounded-xl border border-dashed border-brand-border text-brand-gray text-sm cursor-pointer hover:bg-brand-green-light">
            <Camera className="h-4 w-4" />
            {t('community.photoRequired')}
            <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={onPickPhoto} />
          </label>
        )}

        {errorMsg && <p className="text-sm text-brand-photinia mb-3">{errorMsg}</p>}

        <button
          onClick={submit}
          disabled={!category || submitting || !photo || (category === 'other' && !note.trim())}
          className="w-full px-4 py-3 rounded-xl bg-brand-photinia text-white font-rubik font-bold text-sm disabled:opacity-50"
        >
          {submitting ? t('community.sending') : t('community.send')}
        </button>
      </div>
    </div>
  )
}
