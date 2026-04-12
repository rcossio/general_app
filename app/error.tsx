'use client'

import { useLocale } from '@/contexts/LocaleContext'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLocale()

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
      <p className="text-6xl font-bold text-gray-300 dark:text-gray-700">500</p>
      <h1 className="mt-4 text-xl font-semibold">{t('errors.errorTitle')}</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('errors.errorMessage')}</p>
      <button
        onClick={reset}
        className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {t('errors.tryAgain')}
      </button>
    </div>
  )
}
