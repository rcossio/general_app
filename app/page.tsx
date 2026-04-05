'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useChrome } from '@/contexts/ChromeContext'
import { MapPin, BookOpen, Puzzle, ChevronDown, Globe } from 'lucide-react'

const LOCALE_LABELS: Record<string, string> = { en: 'EN', it: 'IT', es: 'ES' }
const LOCALES = ['it', 'en', 'es'] as const

interface PublicEntry {
  id: string
  type: string
  title: string
  score: number
  user: { name: string }
  createdAt: string
}

export default function LandingPage() {
  const { user, loading } = useAuth()
  const { t, locale, setLocale } = useLocale()
  const { setHideChrome } = useChrome()
  const router = useRouter()
  const [entries, setEntries] = useState<PublicEntry[]>([])
  const [langOpen, setLangOpen] = useState(false)

  // Hide app chrome (sidebar, bottom nav, header) on landing page
  useEffect(() => {
    setHideChrome(true)
    return () => setHideChrome(false)
  }, [setHideChrome])

  // If logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  // Fetch public community entries
  useEffect(() => {
    fetch('/api/tracker/entries/public?limit=6')
      .then((r) => r.json())
      .then((b) => setEntries(b.data?.entries ?? []))
      .catch(() => {})
  }, [])

  if (loading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400 text-sm">...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between h-14 px-4 md:px-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-700">
        <span className="font-bold text-lg text-blue-600">Vysi</span>
        <div className="flex items-center gap-3">
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Globe className="h-4 w-4" />
              {LOCALE_LABELS[locale]}
              <ChevronDown className="h-3 w-3" />
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-1 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[80px]">
                {LOCALES.map((l) => (
                  <button
                    key={l}
                    onClick={() => { setLocale(l); setLangOpen(false) }}
                    className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${locale === l ? 'text-blue-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    {LOCALE_LABELS[l]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/login"
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
          >
            {t('auth.signIn')}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 md:py-24 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 max-w-lg">
          {t('landing.tagline')}
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-md">
          {t('landing.subtitle')}
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
          >
            {t('landing.playNow')}
          </Link>
          <a
            href="#how-it-works"
            className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {t('landing.howItWorks')}
          </a>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-4 py-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">{t('landing.howItWorks')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 mb-3">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-1">{t('landing.step1Title')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('landing.step1Desc')}</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-950 text-green-600 mb-3">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-1">{t('landing.step2Title')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('landing.step2Desc')}</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 mb-3">
                <Puzzle className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-1">{t('landing.step3Title')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('landing.step3Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Community feed */}
      {entries.length > 0 && (
        <section className="px-4 py-16 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">{t('landing.communityTitle')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {entries.map((e) => (
                <div
                  key={e.id}
                  className="px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{e.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shrink-0">
                      {e.score}/10
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {e.user.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="px-4 py-16 bg-blue-600 text-white text-center">
        <h2 className="text-2xl font-bold mb-4">{t('landing.ctaTitle')}</h2>
        <Link
          href="/login"
          className="inline-block px-8 py-3 rounded-xl bg-white text-blue-600 font-semibold text-sm hover:bg-blue-50 transition-colors"
        >
          {t('landing.ctaButton')}
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 text-center text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <p className="font-medium">Vysi</p>
        <p>{t('landing.footer')}</p>
        <div className="flex justify-center gap-4">
          <Link href="/privacy" className="hover:text-blue-600 transition-colors">{t('auth.privacyPolicy')}</Link>
          <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? ''}`} className="hover:text-blue-600 transition-colors">{process.env.NEXT_PUBLIC_CONTACT_EMAIL}</a>
        </div>
      </footer>
    </div>
  )
}
