'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useChrome } from '@/contexts/ChromeContext'
import { prepareImageForUpload, validateImageFile, readStableImage, type ImageError } from '@/modules/community/lib/image'
import type { NoticeView } from '@/modules/community/components/CommunityMap'
import { TimeSimSheet } from '@/modules/community/components/TimeSimSheet'
import { ReportFormSheet } from '@/modules/community/components/ReportFormSheet'
import { NoticeDetailSheet } from '@/modules/community/components/NoticeDetailSheet'
import { useCommunityNotices } from '@/modules/community/lib/useCommunityNotices'

const DEFAULT_CENTER: [number, number] = [45.0118, 8.6216] // Valenza

const CommunityMap = dynamic(() => import('@/modules/community/components/CommunityMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-background flex items-center justify-center text-brand-gray text-sm">…</div>,
})

export default function CommunityPage() {
  const router = useRouter()
  const { t } = useLocale()
  const { user, fetchWithAuth } = useAuth()
  const { setHideChrome } = useChrome()

  const { notices, quota, createNotice, deleteNotice, markFixed } = useCommunityNotices()
  const [playerPos, setPlayerPos] = useState<{ lat: number; lng: number } | null>(null)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)
  const handleCenterChange = useCallback((lat: number, lng: number) => setMapCenter({ lat, lng }), [])
  const [selected, setSelected] = useState<NoticeView | null>(null)

  // Settings menu (gear) — holds the opt-in tester time simulation (and future settings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [simEnabled, setSimEnabled] = useState(false)
  const [simDays, setSimDays] = useState(0)

  // Report flow — two steps: 'place' (pin the location) then 'form' (pick the problem)
  const [reportStep, setReportStep] = useState<'place' | 'form' | null>(null)
  const reporting = reportStep !== null
  const [placement, setPlacement] = useState<{ lat: number; lng: number } | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Volunteer "mark fixed" flow (before/after photos)
  const [fixMode, setFixMode] = useState(false)
  const [fixBefore, setFixBefore] = useState<{ file: File; preview: string } | null>(null)
  const [fixAfter, setFixAfter] = useState<{ file: File; preview: string } | null>(null)
  const [fixingSubmit, setFixingSubmit] = useState(false)
  const [fixError, setFixError] = useState<string | null>(null)

  const isAdmin = user?.roles?.some((r) => ['master_admin', 'admin'].includes(r)) ?? false
  const canSimulate = isAdmin || (user?.permissions?.includes('community:tester') ?? false)
  const now = simEnabled ? Date.now() + simDays * 86_400_000 : Date.now()

  useEffect(() => {
    setHideChrome(true)
    return () => setHideChrome(false)
  }, [setHideChrome])

  // GPS (best effort — page works without it)
  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (p) => setPlayerPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const center = useMemo<[number, number]>(() => {
    if (playerPos) return [playerPos.lat, playerPos.lng]
    if (notices.length) return [notices[0].lat, notices[0].lng]
    return DEFAULT_CENTER
  }, [playerPos, notices])

  const startReport = () => {
    if (!user) {
      router.push('/login')
      return
    }
    setErrorMsg(null)
    setCategory(null)
    setNote('')
    setPhoto(null)
    setPlacement(mapCenter ?? { lat: center[0], lng: center[1] })
    setReportStep('place')
  }

  const cancelReport = () => {
    setReportStep(null)
    setPlacement(null)
    if (photo) URL.revokeObjectURL(photo.preview)
    setPhoto(null)
  }

  const imageErrorMsg = (err: ImageError) =>
    err === 'too_large'
      ? t('community.photoTooLarge')
      : err === 'decode'
        ? t('community.photoDecode')
        : t('community.photoInvalid')

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const err = validateImageFile(file)
    if (err) {
      setErrorMsg(imageErrorMsg(err))
      e.target.value = ''
      return
    }
    let stable: File
    try {
      stable = await readStableImage(file)
    } catch {
      setErrorMsg(t('community.photoDecode'))
      e.target.value = ''
      return
    }
    if (photo) URL.revokeObjectURL(photo.preview)
    setErrorMsg(null)
    setPhoto({ file: stable, preview: URL.createObjectURL(stable) })
  }

  const submit = async () => {
    if (!category || !placement || !photo) return
    setSubmitting(true)
    setErrorMsg(null)
    try {
      const photoKey = await uploadPhoto(photo.file)
      const result = await createNotice({ category, lat: placement.lat, lng: placement.lng, note, photoKey })
      if (!result.ok) {
        setErrorMsg(
          result.code === 'RATE_LIMIT_DAILY'
            ? t('community.limitDaily')
            : result.code === 'RATE_LIMIT_WEEKLY'
              ? t('community.limitWeekly')
              : t('community.submitError')
        )
        return
      }
      cancelReport()
    } catch (e) {
      setErrorMsg(typeof e === 'string' ? imageErrorMsg(e as ImageError) : t('community.submitError'))
    } finally {
      setSubmitting(false)
    }
  }

  const removeNotice = async (n: NoticeView) => {
    if (await deleteNotice(n.id)) setSelected(null)
  }

  const pickFixPhoto = (which: 'before' | 'after') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const err = validateImageFile(file)
    if (err) {
      setFixError(imageErrorMsg(err))
      e.target.value = ''
      return
    }
    let stable: File
    try {
      stable = await readStableImage(file)
    } catch {
      setFixError(t('community.photoDecode'))
      e.target.value = ''
      return
    }
    setFixError(null)
    const set = which === 'before' ? setFixBefore : setFixAfter
    set((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview)
      return { file: stable, preview: URL.createObjectURL(stable) }
    })
  }

  const closeFix = () => {
    if (fixBefore) URL.revokeObjectURL(fixBefore.preview)
    if (fixAfter) URL.revokeObjectURL(fixAfter.preview)
    setFixBefore(null)
    setFixAfter(null)
    setFixMode(false)
    setFixError(null)
  }

  const closeDetail = () => {
    closeFix()
    setSelected(null)
  }

  const uploadPhoto = async (file: File): Promise<string> => {
    const blob = await prepareImageForUpload(file)
    const urlRes = await fetchWithAuth('/api/community/notices/upload-url', { method: 'POST' })
    if (!urlRes.ok) throw new Error('upload-url')
    const { uploadUrl, key } = (await urlRes.json()).data
    const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob })
    if (!put.ok) throw new Error('upload')
    return key
  }

  const submitFix = async () => {
    if (!selected || !fixBefore || !fixAfter) return
    setFixingSubmit(true)
    setFixError(null)
    try {
      const beforePhotoKey = await uploadPhoto(fixBefore.file)
      const afterPhotoKey = await uploadPhoto(fixAfter.file)
      const updated = await markFixed(selected.id, { beforePhotoKey, afterPhotoKey })
      if (!updated) throw new Error('patch')
      closeDetail()
    } catch (e) {
      setFixError(typeof e === 'string' ? imageErrorMsg(e as ImageError) : t('community.fixError'))
    } finally {
      setFixingSubmit(false)
    }
  }

  return (
    <div className="relative flex flex-col" style={{ height: '100dvh' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14 bg-brand-green text-white shrink-0 z-10">
        <button onClick={() => router.push('/dashboard')} className="p-1.5 rounded-full hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <span className="font-rubik font-bold">{t('community.title')}</span>
        <div className="flex items-center gap-1">
          {canSimulate && (
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Ajustes"
              className={`p-1.5 rounded-full hover:bg-white/10 ${simEnabled && simDays > 0 ? 'bg-white/20' : ''}`}
            >
              <Settings className="h-5 w-5" strokeWidth={2.5} />
            </button>
          )}
          {user ? (
            <span className="text-xs font-medium opacity-90 min-w-[28px] text-right">
              {quota ? `${quota.usedToday}/${quota.dailyMax}` : ''}
            </span>
          ) : (
            <button onClick={() => router.push('/login')} className="text-xs font-rubik font-bold px-2 py-1 rounded-lg hover:bg-white/10">
              {t('auth.signIn')}
            </button>
          )}
        </div>
      </div>

      {/* Settings sheet (gear) — tester time simulation lives here, opt-in */}
      {canSimulate && settingsOpen && (
        <TimeSimSheet
          simEnabled={simEnabled}
          setSimEnabled={setSimEnabled}
          simDays={simDays}
          setSimDays={setSimDays}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Map */}
      <div className="flex-1 relative overflow-hidden z-0">
        <CommunityMap
          notices={notices}
          onSelect={(n) => setSelected(n)}
          playerPosition={playerPos}
          placement={placement}
          onPlacementMove={(lat, lng) => setPlacement({ lat, lng })}
          placementDraggable={reportStep === 'place'}
          onCenterChange={handleCenterChange}
          now={now}
          center={center}
        />

        {/* Simulation-active indicator */}
        {simEnabled && simDays > 0 && !reporting && (
          <button
            onClick={() => setSettingsOpen(true)}
            className="absolute top-3 left-3 z-[1000] px-2.5 py-1 rounded-full bg-black/70 text-white text-[11px] font-rubik font-bold"
          >
            ⏱ +{simDays}d
          </button>
        )}

        {/* Report FAB */}
        {!reporting && !selected && (
          <button
            onClick={startReport}
            aria-label={t('community.report')}
            className="absolute bottom-5 right-4 z-[1000] flex items-center gap-2 px-4 h-12 rounded-full bg-brand-photinia text-white font-rubik font-bold text-sm shadow-lg"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
            {t('community.report')}
          </button>
        )}

        {/* Drag hint while placing */}
        {reportStep === 'place' && (
          <>
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-medium">
              {t('community.dragHint')}
            </div>
            <div className="absolute inset-x-0 bottom-0 z-[1000] p-3">
              <div className="flex gap-2 max-w-md mx-auto">
                <button onClick={cancelReport} className="px-4 py-3 rounded-xl bg-surface border border-brand-border text-brand-text font-rubik font-bold text-sm shadow">
                  {t('common.cancel')}
                </button>
                <button onClick={() => setReportStep('form')} className="flex-1 px-4 py-3 rounded-xl bg-brand-photinia text-white font-rubik font-bold text-sm shadow-lg">
                  {t('community.confirmLocation')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Notice detail sheet */}
      {selected && !reporting && (
        <NoticeDetailSheet
          notice={selected}
          isAdmin={isAdmin}
          canFix={!!user}
          onClose={closeDetail}
          onRemove={() => removeNotice(selected)}
          fixMode={fixMode}
          onStartFix={() => setFixMode(true)}
          fixBefore={fixBefore}
          fixAfter={fixAfter}
          fixError={fixError}
          fixingSubmit={fixingSubmit}
          pickFixPhoto={pickFixPhoto}
          closeFix={closeFix}
          submitFix={submitFix}
        />
      )}

      {/* Report sheet (step 2 — pick the problem) */}
      {reportStep === 'form' && (
        <ReportFormSheet
          category={category}
          setCategory={setCategory}
          note={note}
          setNote={setNote}
          photo={photo}
          onPickPhoto={onPickPhoto}
          onRemovePhoto={() => { if (photo) URL.revokeObjectURL(photo.preview); setPhoto(null) }}
          submit={submit}
          submitting={submitting}
          errorMsg={errorMsg}
          onBack={() => setReportStep('place')}
          onCancel={cancelReport}
        />
      )}
    </div>
  )
}
