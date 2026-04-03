'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useChrome } from '@/contexts/ChromeContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { LocationSheet } from '@/modules/adventure/components/LocationSheet'
import { InventorySheet, type GameItem } from '@/modules/adventure/components/InventorySheet'
import { FakeGpsDpad } from '@/modules/adventure/components/FakeGpsDpad'
import { usePlayerPosition } from '@/modules/adventure/lib/usePlayerPosition'
import { distanceMeters } from '@/modules/adventure/lib/haversine'
import { ArrowLeft, MapPin, Trophy, RefreshCw, Settings, RotateCcw, Crosshair, X, Backpack, Share2, Copy, Check, Trash2 } from 'lucide-react'
import type { MapLocation } from '@/modules/adventure/components/AdventureMap'

type ResolvedLocation = MapLocation & {
  imageUrl: string | null
  narrative: string | null
  status: 'open' | 'closed' | null
  choices: { id: string; label: string }[] | null
  hasPassword: boolean
}

// Dynamic import: Leaflet requires browser environment
const AdventureMap = dynamic(
  () => import('@/modules/adventure/components/AdventureMap'),
  { ssr: false, loading: () => <MapPlaceholder /> }
)

function MapPlaceholder() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
      <div className="animate-pulse text-gray-400 text-sm">…</div>
    </div>
  )
}

type I18nString = string | Record<string, string>

function resolveI18n(value: I18nString | null | undefined, locale: string): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale] ?? Object.values(value)[0] ?? ''
}

interface ApiLocationChoice {
  id: string
  label: I18nString
}

interface ApiLocation {
  id: string
  name: I18nString
  lat: number
  lng: number
  radiusM: number
  type: string
  imageUrl: string | null
  visible: boolean
  visited: boolean
  status: string | null
  narrative: I18nString | null
  choices: ApiLocationChoice[] | null
  hasPassword: boolean
  initialLocation: boolean
}

interface SessionState {
  session: {
    id: string
    gameId: string
    startedAt: string
    completedAt: string | null
    flags: string[]
    visitedLocationIds: string[]
  }
  game: {
    id: string
    title: string
    chapter: number
    nextGameId: string | null
    items: GameItem[]
  }
  locations: ApiLocation[]
  isSpectator: boolean
}

interface VisitResult {
  narrative: I18nString
  imageUrl: string | null
  newFlags: string[]
  revokedFlags: string[]
  completesChapter: boolean
  alreadyVisited: boolean
  nextGameId: string | null
  passwordWrong?: boolean
  shouldRefresh?: boolean
}

export default function SessionPage({
  params,
}: {
  params: { sessionId: string }
}) {
  return (
    <ProtectedRoute>
      <GameMap sessionId={params.sessionId} />
    </ProtectedRoute>
  )
}

function GameMap({ sessionId }: { sessionId: string }) {
  const { fetchWithAuth, user } = useAuth()
  const { locale, t } = useLocale()
  const { setHideChrome } = useChrome()
  const router = useRouter()

  const [state, setState] = useState<SessionState | null>(null)
  const [fakeMode, setFakeMode] = useState(false)
  const { playerPos, gpsError, move, teleport, recenterKey } = usePlayerPosition(fakeMode)
  const [selectedLocation, setSelectedLocation] = useState<ResolvedLocation | null>(null)
  const [visiting, setVisiting] = useState(false)
  const [passwordWrong, setPasswordWrong] = useState(false)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [completeBannerDismissed, setCompleteBannerDismissed] = useState(false)
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)

  const loadState = useCallback(
    async (sid: string) => {
      const res = await fetchWithAuth(`/api/adventure/sessions/${sid}`)
      const body = await res.json()
      if (body.data) setState(body.data)
      setLoading(false)
    },
    [fetchWithAuth]
  )

  useEffect(() => {
    setHideChrome(true)
    return () => setHideChrome(false)
  }, [setHideChrome])

  useEffect(() => {
    loadState(sessionId)
  }, [sessionId, loadState])

  const isSpectator = state?.isSpectator ?? false
  const isAdmin = user?.roles?.some((r: string) => ['master_admin', 'admin'].includes(r)) ?? false

  // Spectators poll every 5s to stay in sync with the owner
  useEffect(() => {
    if (!isSpectator) return
    const interval = setInterval(() => loadState(sessionId), 10000)
    return () => clearInterval(interval)
  }, [isSpectator, sessionId, loadState])

  // Resolve multilingual fields for the current locale
  const resolvedLocations: ResolvedLocation[] = useMemo(
    () =>
      (state?.locations ?? []).map((loc) => ({
        ...loc,
        name: resolveI18n(loc.name, locale),
        imageUrl: loc.imageUrl,
        narrative: loc.narrative ? resolveI18n(loc.narrative, locale) : null,
        status: loc.status as 'open' | 'closed' | null,
        choices: loc.choices
          ? loc.choices.map((c) => ({ id: c.id, label: resolveI18n(c.label, locale) }))
          : null,
        type: loc.type,
        hasPassword: loc.hasPassword,
      })),
    [state, locale]
  )

  // All visible locations currently within range (for green coloring and hint bar)
  const nearbyLocationIds: Set<string> = (() => {
    if (!playerPos || !state) return new Set()
    const ids = new Set<string>()
    for (const loc of state.locations) {
      if (!loc.visible) continue
      const dist = distanceMeters(playerPos.lat, playerPos.lng, loc.lat, loc.lng)
      if (dist <= loc.radiusM) ids.add(loc.id)
    }
    return ids
  })()

  const doVisit = async (locationId: string, lat: number, lng: number, choiceId?: string, password?: string) => {
    if (isSpectator) return
    setVisiting(true)
    try {
      const res = await fetchWithAuth(`/api/adventure/sessions/${sessionId}/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId, lat, lng,
          ...(choiceId ? { choiceId } : {}),
          ...(password !== undefined ? { password } : {}),
        }),
      })
      const body = await res.json()
      if (body.data) {
        if (body.data.passwordWrong) {
          setPasswordWrong(true)
          setSelectedLocation((prev) => prev ? { ...prev, status: 'open' as const } : null)
          await loadState(sessionId)
        } else {
          setPasswordWrong(false)
          // Refresh state to pick up new flags and re-resolved narratives
          await loadState(sessionId)
        }
      }
    } finally {
      setVisiting(false)
    }
  }

  const handleChoose = (choiceId: string) => {
    if (!selectedLocation || !playerPos || selectedLocation.status === 'closed') return
    doVisit(selectedLocation.id, playerPos.lat, playerPos.lng, choiceId)
  }
  const handlePassword = (password: string) => {
    if (!selectedLocation || !playerPos) return
    setPasswordWrong(false)
    doVisit(selectedLocation.id, playerPos.lat, playerPos.lng, undefined, password)
  }

  const handleClose = async () => {
    if (!selectedLocation || isSpectator) return
    setVisiting(true)
    try {
      await fetchWithAuth(`/api/adventure/sessions/${sessionId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: selectedLocation.id }),
      })
      await loadState(sessionId)
      setSelectedLocation(null)
    } finally {
      setVisiting(false)
    }
  }

  const distanceToSelected =
    playerPos && selectedLocation
      ? distanceMeters(playerPos.lat, playerPos.lng, selectedLocation.lat, selectedLocation.lng)
      : null

  const withinRange =
    distanceToSelected !== null && selectedLocation !== null
      ? distanceToSelected <= selectedLocation.radiusM
      : false

  // Sheet is locked when the location is unvisited and in range — must act, can't dismiss
  const sheetLocked = withinRange && selectedLocation !== null && selectedLocation.status === null

  // Auto-visit: when sheet opens in range and status isn't already open, fire visit immediately
  const autoVisitedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!selectedLocation || !playerPos || !withinRange) return
    if (selectedLocation.status === 'open') return
    const key = `${selectedLocation.id}:${selectedLocation.status}`
    if (autoVisitedRef.current.has(key)) return
    autoVisitedRef.current.add(key)
    doVisit(selectedLocation.id, playerPos.lat, playerPos.lng)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation?.id, selectedLocation?.status, withinRange])

  // Keep selectedLocation in sync with resolved state after loadState
  useEffect(() => {
    if (!selectedLocation || !state) return
    const updated = resolvedLocations.find((l) => l.id === selectedLocation.id)
    if (updated) {
      setSelectedLocation(updated)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  // Auto-open sheet for event locations when the player enters their radius
  const autoOpenedEventIds = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!playerPos || !state) return
    for (const loc of resolvedLocations) {
      if (loc.type !== 'event') continue
      if (!loc.visible) continue
      if (autoOpenedEventIds.current.has(loc.id)) continue
      const dist = distanceMeters(playerPos.lat, playerPos.lng, loc.lat, loc.lng)
      if (dist > loc.radiusM) continue
      autoOpenedEventIds.current.add(loc.id)
      setSelectedLocation(loc)
      break
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerPos, state])

  // Persist pending location to localStorage so the sheet re-opens after app restart
  const pendingKey = `adventure_pending_${sessionId}`
  useEffect(() => {
    if (selectedLocation && selectedLocation.status === null && withinRange) {
      localStorage.setItem(pendingKey, selectedLocation.id)
    } else if (!selectedLocation) {
      localStorage.removeItem(pendingKey)
    }
  }, [selectedLocation, withinRange, pendingKey])

  // Restore pending location on session load
  useEffect(() => {
    if (!state) return
    const pendingId = localStorage.getItem(pendingKey)
    if (!pendingId) return
    const loc = resolvedLocations.find((l) => l.id === pendingId && l.status === null)
    if (loc) {
      setSelectedLocation(loc)
    } else {
      localStorage.removeItem(pendingKey)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-pulse text-gray-400 text-sm">{t('adventure.loading')}</div>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4 text-gray-500">
        <p>{t('adventure.sessionNotFound')}</p>
        <button onClick={() => router.push('/adventure')} className="text-blue-600 underline text-sm">
          {t('adventure.backToAdventures')}
        </button>
      </div>
    )
  }

  const handleGenerateCode = async () => {
    const res = await fetchWithAuth(`/api/adventure/sessions/${sessionId}/share`, { method: 'POST' })
    const body = await res.json()
    if (body.data?.joinCode) setShareCode(body.data.joinCode)
  }

  const handleRevokeCode = async () => {
    await fetchWithAuth(`/api/adventure/sessions/${sessionId}/share`, { method: 'DELETE' })
    setShareCode(null)
    setConfirmRevoke(false)
  }

  const handleCopyCode = () => {
    if (!shareCode) return
    navigator.clipboard.writeText(shareCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const visibleCount = resolvedLocations.filter((l) => l.visible).length
  const visitedCount = state.session.visitedLocationIds.length
  // Hint bar only for locations (events auto-open the sheet, no hint needed)
  const nearbyLocation = resolvedLocations.find(
    (l) => nearbyLocationIds.has(l.id) && l.status === null && l.type === 'location'
  ) ?? null

  return (
    <div className="relative flex flex-col" style={{ height: '100dvh' }}>

      {/* Fake GPS active banner */}
      {fakeMode && isAdmin && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs border-b border-amber-200 dark:border-amber-800 shrink-0 flex items-center justify-between gap-4">
          <span>{t('adventure.fakeGpsActive')}</span>
        </div>
      )}

      {/* Spectator banner */}
      {isSpectator && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs border-b border-blue-200 dark:border-blue-800 shrink-0 text-center">
          {t('adventure.spectatorBanner')} · {t('adventure.spectatorRefreshHint')}
        </div>
      )}

      {/* GPS error banner */}
      {gpsError && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs text-center border-b border-red-200 dark:border-red-800 shrink-0">
          {gpsError}
        </div>
      )}

      {/* Map — fills all space except stats bar */}
      <div className="flex-1 relative overflow-hidden">
        <AdventureMap
          locations={resolvedLocations}
          playerPosition={playerPos}
          onLocationClick={(loc) => setSelectedLocation(loc as ResolvedLocation)}
          nearbyLocationIds={nearbyLocationIds}
          recenterKey={recenterKey}
        />
      </div>

      {/* Bottom bar */}
      <div className="relative flex items-center justify-between px-6 py-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shrink-0 z-10 text-xs text-gray-500">
        <button
          onClick={() => router.push('/adventure')}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {visitedCount}/{visibleCount}
        </span>
        <button onClick={() => loadState(sessionId)} className="p-1 hover:text-blue-600">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setInventoryOpen(true)} className="p-1 hover:text-blue-600">
          <Backpack className="h-4 w-4" />
        </button>
        <button onClick={() => setMenuOpen((v) => !v)} className="p-1 hover:text-blue-600">
          <Settings className="h-4 w-4" />
        </button>

      </div>

      {/* Settings sheet */}
      {menuOpen && (
        <div className="absolute inset-0 z-[2000] flex items-end" onClick={() => { setMenuOpen(false); setConfirmRestart(false); setConfirmRevoke(false) }}>
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-gray-700 p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
            {confirmRestart ? (
              <>
                <p className="font-bold text-base mb-2">{t('adventure.restartChapterConfirm')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {t('adventure.restartChapterWarning')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmRestart(false)}
                    className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={async () => {
                      setMenuOpen(false)
                      setConfirmRestart(false)
                      await fetchWithAuth(`/api/adventure/sessions/${sessionId}`, { method: 'DELETE' })
                      router.push('/adventure')
                    }}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                  >
                    {t('adventure.restart')}
                  </button>
                </div>
              </>
            ) : confirmRevoke ? (
              <>
                <p className="font-bold text-base mb-2">{t('adventure.revokeCode')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {t('adventure.revokeCodeConfirm')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmRevoke(false)}
                    className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleRevokeCode}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                  >
                    {t('adventure.revokeCode')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">{t('adventure.chapterSettings')}</p>

                {/* Share session — owner only */}
                {!isSpectator && (
                  <>
                    {shareCode ? (
                      <div className="mb-1 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('adventure.joinCode')}</span>
                          <button
                            onClick={() => setConfirmRevoke(true)}
                            className="p-1 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-mono font-bold tracking-[0.3em] text-blue-700 dark:text-blue-300">{shareCode}</span>
                          <button
                            onClick={handleCopyCode}
                            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400"
                          >
                            {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleGenerateCode}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                      >
                        <Share2 className="h-4 w-4" />
                        {t('adventure.shareSession')}
                      </button>
                    )}
                  </>
                )}

                {/* Fake GPS — admin/master_admin only */}
                {!isSpectator && isAdmin && (
                  <button
                    onClick={() => { setFakeMode((v) => !v); setMenuOpen(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-1 ${fakeMode ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                  >
                    <Crosshair className="h-4 w-4" />
                    {t('adventure.fakeGps')}
                    {fakeMode && <span className="ml-auto text-xs font-normal">ON</span>}
                  </button>
                )}

                {/* Restart — owner only */}
                {!isSpectator && (
                  <button
                    onClick={() => setConfirmRestart(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950 text-sm font-medium"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('adventure.restartChapter')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Chapter complete banner — dismissible, non-blocking */}
      {state.session.completedAt && !completeBannerDismissed && (
        <div className="absolute top-0 left-0 right-0 z-[2000] px-4 py-3 bg-green-600 text-white shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Trophy className="h-4 w-4 text-yellow-300 shrink-0" />
              <p className="font-semibold text-sm truncate">{t('adventure.chapterComplete')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {state.game.nextGameId && (
                <button
                  onClick={async () => {
                    const res = await fetchWithAuth('/api/adventure/sessions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ gameId: state.game.nextGameId }),
                    })
                    const body = await res.json()
                    if (body.data?.sessionId) router.push(`/adventure/${body.data.sessionId}`)
                  }}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium"
                >
                  {t('adventure.nextChapter')}
                </button>
              )}
              <button
                onClick={() => setCompleteBannerDismissed(true)}
                className="p-1 hover:bg-white/20 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nearby hint bar — shown when in range but sheet is closed */}
      {nearbyLocation && nearbyLocation.status === null && !selectedLocation && (
        <div className="absolute bottom-10 left-0 right-0 z-[1500] px-4 pb-2 pt-2">
          <button
            onClick={() => setSelectedLocation(nearbyLocation)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📍</span>
              <div className="text-left">
                <p className="font-semibold text-sm leading-tight">{nearbyLocation.name}</p>
                <p className="text-xs text-green-100">{t('adventure.newLocationFound')}</p>
              </div>
            </div>
            <span className="text-xl">→</span>
          </button>
        </div>
      )}

      {/* Fake GPS D-pad — outside map container to avoid Leaflet clipping */}
      {fakeMode && isAdmin && (
        <div className="absolute bottom-32 right-4 z-[1500] bg-black/20 rounded-2xl p-1">
          <FakeGpsDpad
            move={move}
            teleport={teleport}
            startLocation={state?.locations.find((l) => l.initialLocation) ?? null}
          />
        </div>
      )}

      {/* Inventory sheet */}
      {inventoryOpen && state && (
        <InventorySheet
          items={state.game.items}
          playerFlags={state.session.flags}
          onClose={() => setInventoryOpen(false)}
        />
      )}

      {/* Location sheet */}
      {selectedLocation && (
        <LocationSheet
          name={selectedLocation.name}
          type={selectedLocation.type}
          imageUrl={selectedLocation.imageUrl}
          narrative={selectedLocation.narrative}
          status={selectedLocation.status}
          withinRange={isSpectator ? (selectedLocation.status !== null) : withinRange}
          distance={isSpectator ? null : distanceToSelected}
          choices={selectedLocation.choices}
          hasPassword={selectedLocation.hasPassword}
          passwordWrong={passwordWrong}
          locked={sheetLocked}
          onChoose={handleChoose}
          onPassword={handlePassword}
          onDismiss={() => { setSelectedLocation(null); setPasswordWrong(false) }}
          onFinish={handleClose}
          visiting={visiting}
          spectator={isSpectator}
        />
      )}
    </div>
  )
}
