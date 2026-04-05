'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

export default function CompleteProfilePage() {
  return (
    <ProtectedRoute>
      <CompleteProfileForm />
    </ProtectedRoute>
  )
}

function CompleteProfileForm() {
  const { user, fetchWithAuth } = useAuth()
  const { t } = useLocale()
  const router = useRouter()
  const [name, setName] = useState(user?.name ?? '')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (!privacyAccepted) {
      setError(t('auth.privacyRequired'))
      return
    }
    setError('')
    setLoading(true)
    try {
      await fetchWithAuth('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), acceptPrivacy: true }),
      })
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2 text-center">{t('auth.completeProfile')}</h1>
        <p className="text-sm text-gray-500 text-center mb-6">{t('auth.whatsYourName')}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('auth.name')}
            maxLength={100}
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => { setPrivacyAccepted(e.target.checked); setError('') }}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.acceptPrivacy')}{' '}
              <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                {t('auth.privacyPolicy')}
              </Link>
            </span>
          </label>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {t('auth.continueButton')}
          </button>
        </form>
      </div>
    </div>
  )
}
