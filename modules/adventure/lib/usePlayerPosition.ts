'use client'

import { useState, useEffect, useRef } from 'react'
import { useLocale } from '@/contexts/LocaleContext'

export interface PlayerPosition {
  lat: number
  lng: number
  accuracy: number
}

const STEP = 0.00005 // ~5 m per keypress

export function usePlayerPosition(fakeMode: boolean) {
  const { t } = useLocale()
  const [playerPos, setPlayerPos] = useState<PlayerPosition | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)

  // Real GPS
  useEffect(() => {
    if (fakeMode) return

    if (!navigator.geolocation) {
      setGpsError(t('adventure.gpsNotSupported'))
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
          setGpsError(t('adventure.locationDenied'))
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [fakeMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fake GPS — keyboard control
  useEffect(() => {
    if (!fakeMode) return

    // Stop real GPS watch if it was running
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    setGpsError(null)

    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      let dlat = 0
      let dlng = 0

      switch (e.key) {
        case 'ArrowUp':    case 'w': case 'W': dlat =  STEP; break
        case 'ArrowDown':  case 's': case 'S': dlat = -STEP; break
        case 'ArrowLeft':  case 'a': case 'A': dlng = -STEP; break
        case 'ArrowRight': case 'd': case 'D': dlng =  STEP; break
        default: return
      }

      e.preventDefault()

      setPlayerPos((prev) => {
        const base = prev ?? { lat: 0, lng: 0, accuracy: 5 }
        return { lat: base.lat + dlat, lng: base.lng + dlng, accuracy: 5 }
      })
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [fakeMode])

  return { playerPos, gpsError }
}
