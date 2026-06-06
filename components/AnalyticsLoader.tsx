'use client'

import { useEffect } from 'react'
import { useConsent } from '@/contexts/ConsentContext'

// Injects the analytics script ONLY after the user grants consent.
// Tool-agnostic: configure via env. Example (Umami):
//   NEXT_PUBLIC_ANALYTICS_SRC=https://analytics.yourdomain.com/script.js
//   NEXT_PUBLIC_ANALYTICS_WEBSITE_ID=<uuid>
// If the env vars are unset, this renders nothing — so the banner can ship now
// and the analytics tool can be wired in later by setting the vars.
const SRC = process.env.NEXT_PUBLIC_ANALYTICS_SRC
const WEBSITE_ID = process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID
const SCRIPT_ID = 'vysi-analytics'

export function AnalyticsLoader() {
  const { analyticsAllowed } = useConsent()

  useEffect(() => {
    if (!analyticsAllowed || !SRC) return
    if (document.getElementById(SCRIPT_ID)) return // already loaded

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.defer = true
    script.src = SRC
    if (WEBSITE_ID) script.setAttribute('data-website-id', WEBSITE_ID)
    document.head.appendChild(script)
  }, [analyticsAllowed])

  return null
}
