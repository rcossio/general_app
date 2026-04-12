'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { z } from 'zod'

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}

function LoginForm() {
  const { login, register } = useAuth()
  const { t } = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Step 1: email + password
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Step 2: registration (name + privacy)
  const [step, setStep] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState(
    searchParams.get('error') === 'google_failed' ? t('auth.googleFailed')
    : searchParams.get('error') === 'google_cancelled' ? t('auth.googleCancelled')
    : ''
  )
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = z.object({
      email: z.string().email(t('auth.invalidEmail')),
      password: z.string().min(1, t('auth.passwordRequired')),
    }).safeParse({ email, password })
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const err of parsed.error.issues) {
        fieldErrors[err.path[0] as string] = err.message
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    setServerError('')
    setLoading(true)
    try {
      const result = await login(email, password)
      if (result.needsRegistration) {
        setName(email.split('@')[0])
        setStep('register')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t('auth.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrors({ name: t('auth.nameRequired') })
      return
    }
    if (!privacyAccepted) {
      setErrors({ privacy: t('auth.privacyRequired') })
      return
    }
    setErrors({})
    setServerError('')
    setLoading(true)
    try {
      await register(email, password, name.trim(), privacyAccepted)
      router.push('/dashboard')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t('auth.registrationFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (step === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-2 text-center">{t('auth.completeProfile')}</h1>
          <p className="text-sm text-gray-500 text-center mb-6">{t('auth.whatsYourName')}</p>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('auth.name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => { setPrivacyAccepted(e.target.checked); setErrors((prev) => { const { privacy, ...rest } = prev; return rest }) }}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('auth.acceptPrivacy')}{' '}
                <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                  {t('auth.privacyPolicy')}
                </Link>
                {' & '}
                <Link href="/terms" target="_blank" className="text-blue-600 hover:underline">
                  {t('auth.termsOfService')}
                </Link>
              </span>
            </label>
            {errors.privacy && <p className="text-xs text-red-500">{errors.privacy}</p>}
            {serverError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 text-sm">
                {serverError}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
            </button>
          </form>
          <p className="mt-4 text-center">
            <button onClick={() => setStep('login')} className="text-sm text-blue-600 hover:underline">
              {t('auth.backToLogin')}
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">{t('auth.signIn')}</h1>

        {/* Google sign-in */}
        <a
          href="/api/auth/google"
          className="flex items-center justify-center gap-3 w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors mb-4"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          <span className="text-sm font-medium">{t('auth.signInWithGoogle')}</span>
        </a>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400">{t('auth.orEmail')}</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('auth.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
          </div>
          {serverError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 text-sm">
              {serverError}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>
        <p className="mt-4 text-center">
          <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
            {t('auth.forgotPassword')}
          </Link>
        </p>
      </div>
    </div>
  )
}
