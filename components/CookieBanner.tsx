'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useConsent } from '@/contexts/ConsentContext'
import { useLocale } from '@/contexts/LocaleContext'

export function CookieBanner() {
  const { bannerOpen, grant, deny } = useConsent()
  const { t } = useLocale()
  const pathname = usePathname()

  // Hide only on the full-screen adventure session map (/adventure/<sessionId>),
  // where a bottom banner would obstruct gameplay. Shows everywhere else,
  // including the landing/privacy/terms pages (which hide the app chrome but
  // still need the consent banner on first contact).
  const inSession = /^\/adventure\/.+/.test(pathname ?? '')
  if (!bannerOpen || inSession) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[3000] p-3 sm:p-4">
      <div className="mx-auto max-w-3xl rounded-2xl border border-brand-border bg-surface shadow-lg p-4 sm:p-5">
        <p className="font-rubik font-bold text-sm mb-1">{t('cookies.title')}</p>
        <p className="text-sm text-brand-text leading-relaxed mb-3">
          {t('cookies.message')}{' '}
          <Link href="/privacy" className="text-brand-green font-medium hover:underline">
            {t('cookies.learnMore')}
          </Link>
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          {/* Reject and Accept are equal-prominence by design (ePrivacy / Garante). */}
          <button
            onClick={deny}
            className="px-5 py-2.5 rounded-xl border border-brand-border text-brand-text font-rubik font-bold text-sm hover:bg-brand-green-light transition-colors"
          >
            {t('cookies.reject')}
          </button>
          <button
            onClick={grant}
            className="px-5 py-2.5 rounded-xl bg-brand-green text-white font-rubik font-bold text-sm hover:opacity-90 transition-opacity"
          >
            {t('cookies.accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
