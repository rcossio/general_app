'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { ProfileCompletionFields } from '@/components/ProfileCompletionFields'

export default function CompleteProfilePage() {
  return (
    <ProtectedRoute>
      <CompleteProfileForm />
    </ProtectedRoute>
  )
}

function CompleteProfileForm() {
  const { user, fetchWithAuth, refreshUser } = useAuth()
  const { t } = useLocale()
  const router = useRouter()
  const needsPrivacy = !user?.privacyAcceptedAt
  const [name, setName] = useState(user?.name ?? '')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (needsPrivacy && !privacyAccepted) {
      setError(t('auth.privacyRequired'))
      return
    }
    setError('')
    setLoading(true)
    try {
      await fetchWithAuth('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          ...(needsPrivacy && { acceptPrivacy: true }),
        }),
      })
      await refreshUser()
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-rubik font-bold mb-2 text-center">{t('auth.completeProfile')}</h1>
        <p className="text-sm text-brand-gray text-center mb-6">{t('auth.whatsYourName')}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ProfileCompletionFields
            name={name}
            onNameChange={setName}
            showPrivacy={needsPrivacy}
            privacyAccepted={privacyAccepted}
            onPrivacyChange={(v) => { setPrivacyAccepted(v); setError('') }}
            privacyError={error}
          />
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2 px-4 bg-brand-photinia hover:bg-brand-photinia-dark disabled:opacity-50 text-white font-rubik font-bold rounded-lg transition-colors"
          >
            {t('auth.continueButton')}
          </button>
        </form>
      </div>
    </div>
  )
}
