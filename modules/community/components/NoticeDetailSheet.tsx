'use client'

import type { ChangeEvent } from 'react'
import { Sparkles, Trash2, Camera } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { getCategory } from '@/modules/community/lib/categories'
import { getIconComponent } from '@/modules/community/lib/icon'
import type { NoticeView } from '@/modules/community/components/CommunityMap'

type PhotoState = { file: File; preview: string }

interface NoticeDetailSheetProps {
  notice: NoticeView
  isAdmin: boolean
  canFix: boolean // a logged-in user can volunteer to fix
  onClose: () => void
  onRemove: () => void
  fixMode: boolean
  onStartFix: () => void
  fixBefore: PhotoState | null
  fixAfter: PhotoState | null
  fixError: string | null
  fixingSubmit: boolean
  pickFixPhoto: (which: 'before' | 'after') => (e: ChangeEvent<HTMLInputElement>) => void
  closeFix: () => void
  submitFix: () => void
}

// Bottom sheet for a selected notice. Three states: a fixed notice (before/after
// photos), the volunteer "mark fixed" flow, and the default open view.
export function NoticeDetailSheet({
  notice,
  isAdmin,
  canFix,
  onClose,
  onRemove,
  fixMode,
  onStartFix,
  fixBefore,
  fixAfter,
  fixError,
  fixingSubmit,
  pickFixPhoto,
  closeFix,
  submitFix,
}: NoticeDetailSheetProps) {
  const { t } = useLocale()

  const relativeTime = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 60) return t('community.justNow')
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return t('community.hoursAgo', { n: String(hrs) })
    return t('community.daysAgo', { n: String(Math.floor(hrs / 24)) })
  }

  const cat = getCategory(notice.category)
  const Icon = getIconComponent(cat.icon)
  const fixed = notice.status === 'fixed'

  return (
    <div className="absolute inset-0 z-[2000] flex items-end" onClick={onClose}>
      <div className="w-full bg-surface rounded-t-2xl shadow-2xl border-t border-brand-border p-5 pb-8 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-brand-border rounded-full mx-auto mb-4" />
        <div className="flex items-center gap-3 mb-3">
          <span className={`flex items-center justify-center w-10 h-10 rounded-full ${fixed ? 'bg-brand-photinia-light text-brand-photinia' : 'bg-brand-green-light text-brand-green'}`}>
            {fixed ? <Sparkles className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
          </span>
          <div>
            <p className="font-rubik font-bold text-base">{t(cat.labelKey)}</p>
            <p className="text-xs text-brand-gray">
              {fixed
                ? `✨ ${t('community.fixed')} · ${relativeTime(notice.fixedAt ?? notice.createdAt)}`
                : relativeTime(notice.createdAt)}
            </p>
          </div>
        </div>

        {notice.status === 'fixed' ? (
          <>
            {notice.note && <p className="text-sm text-brand-text leading-relaxed mb-3">{notice.note}</p>}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[11px] font-rubik font-bold text-brand-gray mb-1">{t('community.before')}</p>
                {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded R2 photo via plain <img>; next/image isn't configured for arbitrary remote hosts */}
                {notice.beforePhotoUrl && <img src={notice.beforePhotoUrl} alt="" className="w-full rounded-xl aspect-square object-cover" />}
              </div>
              <div>
                <p className="text-[11px] font-rubik font-bold text-brand-gray mb-1">{t('community.after')}</p>
                {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded R2 photo via plain <img>; next/image isn't configured for arbitrary remote hosts */}
                {notice.afterPhotoUrl && <img src={notice.afterPhotoUrl} alt="" className="w-full rounded-xl aspect-square object-cover" />}
              </div>
            </div>
            {(notice.isOwn || isAdmin) && (
              <button onClick={onRemove} className="mt-3 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-brand-border text-brand-text font-rubik font-bold text-sm">
                <Trash2 className="h-4 w-4" strokeWidth={2.5} /> {t('community.delete')}
              </button>
            )}
          </>
        ) : fixMode ? (
          <>
            <p className="text-sm text-brand-text mb-3">{t('community.fixTitle')}</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(['before', 'after'] as const).map((which) => {
                const ph = which === 'before' ? fixBefore : fixAfter
                return (
                  <div key={which}>
                    <p className="text-[11px] font-rubik font-bold text-brand-gray mb-1">
                      {which === 'before' ? t('community.before') : t('community.after')}
                    </p>
                    {ph ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local object-URL preview of the user's photo; next/image not used here
                      <img src={ph.preview} alt="" className="w-full rounded-xl aspect-square object-cover" />
                    ) : (
                      <label className="flex items-center justify-center aspect-square rounded-xl border border-dashed border-brand-border text-brand-gray cursor-pointer hover:bg-brand-green-light">
                        <Camera className="h-6 w-6" />
                        <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={pickFixPhoto(which)} />
                      </label>
                    )}
                  </div>
                )
              })}
            </div>
            {fixError && <p className="text-sm text-brand-photinia mb-2">{fixError}</p>}
            <div className="flex gap-2">
              <button onClick={closeFix} className="px-4 py-2.5 rounded-xl border border-brand-border text-brand-text font-rubik font-bold text-sm">
                {t('common.cancel')}
              </button>
              <button onClick={submitFix} disabled={!fixBefore || !fixAfter || fixingSubmit} className="flex-1 px-4 py-2.5 rounded-xl bg-brand-green text-white font-rubik font-bold text-sm disabled:opacity-50">
                {fixingSubmit ? t('community.fixing') : t('community.confirmFix')}
              </button>
            </div>
          </>
        ) : (
          <>
            {notice.note && <p className="text-sm text-brand-text leading-relaxed mb-3">{notice.note}</p>}
            {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded R2 photo via plain <img>; next/image isn't configured for arbitrary remote hosts */}
            {notice.photoUrl && <img src={notice.photoUrl} alt="" className="w-full rounded-xl mb-3 max-h-72 object-cover" />}
            <div className="flex gap-2">
              {canFix && (
                <button onClick={onStartFix} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-green text-white font-rubik font-bold text-sm">
                  <Sparkles className="h-4 w-4" strokeWidth={2.5} /> {t('community.markFixed')}
                </button>
              )}
              {(notice.isOwn || isAdmin) && (
                <button onClick={onRemove} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-brand-border text-brand-text font-rubik font-bold text-sm">
                  <Trash2 className="h-4 w-4" strokeWidth={2.5} /> {t('community.delete')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
