'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { t } = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    // Redirect users who haven't accepted privacy/terms to complete-profile
    if (!user.privacyAcceptedAt && pathname !== '/complete-profile') {
      router.replace('/complete-profile')
    }
  }, [user, loading, router, pathname])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-brand-gray">{t('common.loading')}</div>
      </div>
    )
  }

  if (!user) return null
  if (!user.privacyAcceptedAt && pathname !== '/complete-profile') return null
  return <>{children}</>
}
