'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/contexts/LocaleContext'
import { z } from 'zod'

export default function ForgotPasswordPage() {
  const { t } = useLocale()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = z.string().email(t('auth.invalidEmail')).safeParse(email)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    setError('')
    setLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch {
      setError(t('auth.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-rubik font-bold mb-4">{t('auth.forgotPasswordTitle')}</h1>
          <p className="text-sm text-brand-gray mb-6">{t('auth.resetLinkSent')}</p>
          <Link href="/login" className="text-sm text-brand-green hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-rubik font-bold mb-2 text-center">{t('auth.forgotPasswordTitle')}</h1>
        <p className="text-sm text-brand-gray text-center mb-6">{t('auth.forgotPasswordDesc')}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-brand-photinia hover:bg-brand-photinia-dark disabled:opacity-50 text-white font-rubik font-bold rounded-lg transition-colors"
          >
            {loading ? t('auth.sendingResetLink') : t('auth.sendResetLink')}
          </button>
        </form>
        <p className="mt-4 text-center">
          <Link href="/login" className="text-sm text-brand-green hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  )
}
