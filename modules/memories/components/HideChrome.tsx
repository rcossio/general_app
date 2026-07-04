'use client'

import { useEffect } from 'react'
import { useChrome } from '@/contexts/ChromeContext'

// Hides the app chrome (sidebar / header / bottom nav) for the duration of a
// page. The public memorial page is opened via a QR by people who may not be
// app users, so it should read as a standalone page, not an app screen.
export function HideChrome() {
  const { setHideChrome } = useChrome()
  useEffect(() => {
    setHideChrome(true)
    return () => setHideChrome(false)
  }, [setHideChrome])
  return null
}
