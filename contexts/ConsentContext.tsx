'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

// Consent for non-essential (analytics) cookies.
// 'granted' | 'denied' = a choice was made; null = undecided (show the banner).
// The choice itself is stored in localStorage — remembering a consent decision
// is "strictly necessary" and does not itself require consent.
type Consent = 'granted' | 'denied' | null

const STORAGE_KEY = 'cookie_consent'

interface ConsentContextValue {
  consent: Consent
  // Whether the banner should currently be shown (undecided, or reopened via preferences).
  bannerOpen: boolean
  grant: () => void
  deny: () => void
  // Reopen the banner so the user can change a previous choice.
  openPreferences: () => void
  // True only when the user has actively granted consent.
  analyticsAllowed: boolean
}

const ConsentContext = createContext<ConsentContextValue | null>(null)

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<Consent>(null)
  const [bannerOpen, setBannerOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'granted' || stored === 'denied') {
      setConsent(stored)
    } else {
      // No prior choice — show the banner.
      setBannerOpen(true)
    }
  }, [])

  const grant = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'granted')
    setConsent('granted')
    setBannerOpen(false)
  }, [])

  const deny = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'denied')
    setConsent('denied')
    setBannerOpen(false)
  }, [])

  const openPreferences = useCallback(() => setBannerOpen(true), [])

  return (
    <ConsentContext.Provider
      value={{
        consent,
        bannerOpen,
        grant,
        deny,
        openPreferences,
        analyticsAllowed: consent === 'granted',
      }}
    >
      {children}
    </ConsentContext.Provider>
  )
}

export function useConsent() {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error('useConsent must be used inside ConsentProvider')
  return ctx
}
