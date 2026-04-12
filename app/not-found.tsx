'use client'

import Link from 'next/link'
import { useLocale } from '@/contexts/LocaleContext'

export default function NotFound() {
  const { t } = useLocale()

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
      <p className="text-6xl font-rubik font-bold text-brand-border">404</p>
      <h1 className="mt-4 text-xl font-semibold">{t('errors.notFoundTitle')}</h1>
      <p className="mt-2 text-sm text-brand-gray">{t('errors.notFoundMessage')}</p>
      <Link
        href="/"
        className="mt-6 px-4 py-2 bg-brand-photinia hover:bg-brand-photinia-dark text-white text-sm font-rubik font-bold rounded-lg transition-colors"
      >
        {t('errors.goHome')}
      </Link>
    </div>
  )
}
