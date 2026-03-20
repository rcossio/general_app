'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { LocationSheet } from '@/modules/adventure/components/LocationSheet'
import { distanceMeters } from '@/modules/adventure/lib/haversine'
import { ArrowLeft, MapPin, Star, Trophy, RefreshCw } from 'lucide-react'
import type { MapLocation } from '@/modules/adventure/components/AdventureMap'

// Dynamic import: Leaflet requires browser environment
const AdventureMap = dynamic(
  () => import('@/modules/adventure/components/AdventureMap'),
  { ssr: false, loading: () => <MapPlaceholder /> }
)

function MapPlaceholder() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
      <div className="animate-pulse text-gray-400 text-sm">Loading map...</div>
    </div>
  )
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
    slug: string
    title: string
    chapter: number
    nextGameId: string | null
  }
  locations: MapLocation[]
}

interface PlayerPosition {
  lat: number
  lng: number
  accuracy: number
}

interface VisitResult {
  narrative: string
  newFlags: string[]
  completesChapter: boolean
  alreadyVisited: boolean
  nextGameId: string | null
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
  const { fetchWithAuth } = useAuth()
  const router = useRouter()

  const [state, setState] = useState<SessionState | null>(null)
  const [playerPos, setPlayerPos] = useState<PlayerPosition | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null)
  const [visiting, setVisiting] = useState(false)
  const [visitResult, setVisitResult] = useState<VisitResult | null>(null)
  const [loading, setLoading] = useState(true)
  const watchIdRef = useRef<number | null>(null)
  // Track which location id was last auto-opened so we only open once per entry
  const autoOpenedRef = useRef<string | null>(null)

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
    loadState(sessionId)
  }, [sessionId, loadState])

  // GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null)
        setPlayerPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location access denied. Enable GPS to play.')
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  // Find nearest visible location within range (visited or not — for coloring and hint bar)
  const nearbyLocationId = (() => {
    if (!playerPos || !state) return null
    for (const loc of state.locations) {
      if (!loc.visible) continue
      const dist = distanceMeters(playerPos.lat, playerPos.lng, loc.lat, loc.lng)
      if (dist <= loc.radiusM) return loc.id
    }
    return null
  })()

  // Auto-open the sheet when GPS places the player inside a location's radius.
  // Depends on playerPos (state) so it reliably fires on every GPS update.
  useEffect(() => {
    if (!playerPos || !state) return
    for (const loc of state.locations) {
      if (!loc.visible || loc.visited) continue
      const dist = distanceMeters(playerPos.lat, playerPos.lng, loc.lat, loc.lng)
      if (dist <= loc.radiusM) {
        // Only auto-open once per location entry; user closing the sheet won't reopen it
        if (autoOpenedRef.current === loc.id) return
        autoOpenedRef.current = loc.id
        setSelectedLocation(loc)
        return
      }
    }
    // Player left all radii — reset so re-entering will auto-open again
    autoOpenedRef.current = null
  }, [playerPos, state]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVisit = async () => {
    if (!selectedLocation || !playerPos) return
    setVisiting(true)
    try {
      const res = await fetchWithAuth(`/api/adventure/sessions/${sessionId}/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: selectedLocation.id,
          lat: playerPos.lat,
          lng: playerPos.lng,
        }),
      })
      const body = await res.json()
      if (body.data) {
        setVisitResult(body.data)
        setSelectedLocation(null)
        // Reload session state to get updated flags/visits
        await loadState(sessionId)
      }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-pulse text-gray-400 text-sm">Loading adventure...</div>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4 text-gray-500">
        <p>Session not found.</p>
        <button onClick={() => router.push('/adventure')} className="text-blue-600 underline text-sm">
          Back to adventures
        </button>
      </div>
    )
  }

  const visibleCount = state.locations.filter((l) => l.visible).length
  const visitedCount = state.session.visitedLocationIds.length
  const flagCount = state.session.flags.length
  const nearbyLocation = nearbyLocationId
    ? state.locations.find((l) => l.id === nearbyLocationId) ?? null
    : null

  return (
    <div className="relative flex flex-col" style={{ height: 'calc(100dvh - 64px)' }}>
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shrink-0 z-10">
        <button
          onClick={() => router.push('/adventure')}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-blue-600 font-medium">Chapter {state.game.chapter}</p>
          <h1 className="font-semibold text-sm truncate">{state.game.title}</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {visitedCount}/{visibleCount}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            {flagCount}
          </span>
          <button
            onClick={() => loadState(sessionId)}
            className="p-1 hover:text-blue-600"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* GPS error banner */}
      {gpsError && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs text-center border-b border-red-200 dark:border-red-800 shrink-0">
          {gpsError}
        </div>
      )}

      {/* Chapter complete banner */}
      {state.session.completedAt && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-950 border-b border-green-200 dark:border-green-800 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-300 text-sm">
                  Chapter Complete!
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Completed {new Date(state.session.completedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            {state.game.nextGameId && (
              <button
                onClick={async () => {
                  const res = await fetchWithAuth('/api/adventure/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gameId: state.game.nextGameId }),
                  })
                  const body = await res.json()
                  if (body.data?.sessionId) {
                    router.push(`/adventure/${body.data.sessionId}`)
                  }
                }}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg"
              >
                Next chapter →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Map — fills remaining space */}
      <div className="flex-1 relative overflow-hidden">
        <AdventureMap
          locations={state.locations}
          playerPosition={playerPos}
          onLocationClick={setSelectedLocation}
          nearbyLocationId={nearbyLocationId}
        />
      </div>

      {/* Visit result toast */}
      {visitResult && (
        <div
          className="absolute bottom-24 left-4 right-4 z-[2000] p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl"
          onClick={() => setVisitResult(null)}
        >
          {visitResult.completesChapter ? (
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="font-bold text-green-700 dark:text-green-400">Chapter Complete!</span>
            </div>
          ) : null}
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {visitResult.narrative}
          </p>
          {visitResult.newFlags.length > 0 && (
            <p className="text-xs text-blue-600 mt-2">
              + {visitResult.newFlags.join(', ')}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2 text-right">Tap to dismiss</p>
        </div>
      )}

      {/* Nearby hint bar — shown when in range but sheet is closed */}
      {nearbyLocation && !selectedLocation && !visitResult && !state.session.completedAt && (
        <div className="absolute bottom-0 left-0 right-0 z-[1500] px-4 pb-4 pt-2">
          <button
            onClick={() => setSelectedLocation(nearbyLocation)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📍</span>
              <div className="text-left">
                <p className="font-semibold text-sm leading-tight">{nearbyLocation.name}</p>
                <p className="text-xs text-green-100">You are within range — tap to interact</p>
              </div>
            </div>
            <span className="text-xl">→</span>
          </button>
        </div>
      )}

      {/* Location sheet */}
      {selectedLocation && (
        <LocationSheet
          name={selectedLocation.name}
          narrative={selectedLocation.narrative}
          visited={selectedLocation.visited}
          withinRange={withinRange}
          distance={distanceToSelected}
          onVisit={handleVisit}
          onClose={() => setSelectedLocation(null)}
          visiting={visiting}
        />
      )}
    </div>
  )
}
