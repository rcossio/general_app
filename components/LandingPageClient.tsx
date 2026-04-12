'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useChrome } from '@/contexts/ChromeContext'
import { ChevronDown, MapPin, Clock, Smartphone, X } from 'lucide-react'
import { LOCALES } from '@/locales'

export default function LandingPageClient() {
  const { user, loading } = useAuth()
  const { t, locale, setLocale } = useLocale()
  const { setHideChrome } = useChrome()
  const [langOpen, setLangOpen] = useState(false)

  useEffect(() => {
    setHideChrome(true)
    return () => setHideChrome(false)
  }, [setHideChrome])

  const isLoggedIn = !loading && user

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar — standalone, no app chrome */}
      <nav className="sticky top-0 z-50 flex items-center justify-between h-14 px-4 md:px-8 bg-brand-green">
        <span className="font-rubik font-extrabold text-[26px] text-white">vysi</span>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10"
            >
              <span>{LOCALES.find((l) => l.value === locale)?.flag}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-1 py-1 bg-surface rounded-lg shadow-lg border border-brand-border min-w-[80px]">
                {LOCALES.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => { setLocale(l.value); setLangOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-brand-green-light ${locale === l.value ? 'text-brand-green font-medium' : 'text-brand-text'}`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link
            href={isLoggedIn ? '/dashboard' : '/login'}
            className="px-4 py-1.5 rounded-lg text-sm font-rubik font-bold text-white hover:bg-white/10 transition-colors"
          >
            {isLoggedIn ? t('nav.dashboard') : t('auth.signIn')}
          </Link>
        </div>
      </nav>

      {/* Hero — cinematic, mystery-driven */}
      <section className="relative flex flex-col items-center justify-center px-4 py-20 md:py-32 text-center text-white overflow-hidden bg-gradient-to-b from-[#2d7a3e] via-brand-green to-[#3a9148]">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-jakarta font-medium mb-6 backdrop-blur-sm">
            <Smartphone className="h-3 w-3" />
            <span>{t('landing.badge')}</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-rubik font-bold tracking-tight mb-5 leading-tight">
            {t('landing.heroLine1')}{' '}
            <span className="text-brand-photinia">{t('landing.heroHighlight')}</span>
            {t('landing.heroLine2')}
          </h1>

          <p className="text-base md:text-lg text-white/75 mb-3 max-w-lg mx-auto font-jakarta leading-relaxed">
            {t('landing.heroSub')}
          </p>

          <p className="text-sm text-white/50 mb-8 font-jakarta italic">
            {t('landing.tagline')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={isLoggedIn ? '/adventure' : '/login'}
              className="px-7 py-3.5 rounded-xl bg-brand-photinia hover:bg-brand-photinia-dark text-white font-rubik font-bold text-sm transition-colors shadow-lg shadow-black/20"
            >
              {isLoggedIn ? t('nav.adventure') : t('landing.playNow')}
            </Link>
            <a
              href="#preview"
              className="px-7 py-3.5 rounded-xl border border-white/25 text-white font-rubik font-semibold text-sm hover:bg-white/10 transition-colors"
            >
              {t('landing.seePreview')}
            </a>
          </div>

          <div className="flex items-center justify-center gap-6 mt-10 text-xs text-white/60 font-jakarta">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {t('landing.duration')}</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Valenza (AL)</span>
            <span>🎟 {t('landing.free')}</span>
          </div>
        </div>
      </section>

      {/* How it feels */}
      <section id="how-it-works" className="px-4 py-16 bg-surface">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-rubik font-bold text-center mb-10 text-brand-black">{t('landing.howTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-brand-green-light">
              <p className="text-2xl mb-3">📩</p>
              <h3 className="font-rubik font-bold text-sm mb-1.5">{t('landing.exp1Title')}</h3>
              <p className="text-sm text-brand-gray font-jakarta leading-relaxed">{t('landing.exp1Desc')}</p>
            </div>
            <div className="p-5 rounded-2xl bg-brand-green-light">
              <p className="text-2xl mb-3">🗺️</p>
              <h3 className="font-rubik font-bold text-sm mb-1.5">{t('landing.exp2Title')}</h3>
              <p className="text-sm text-brand-gray font-jakarta leading-relaxed">{t('landing.exp2Desc')}</p>
            </div>
            <div className="p-5 rounded-2xl bg-brand-photinia-light">
              <p className="text-2xl mb-3">🔓</p>
              <h3 className="font-rubik font-bold text-sm mb-1.5 text-brand-photinia">{t('landing.exp3Title')}</h3>
              <p className="text-sm text-brand-gray font-jakarta leading-relaxed">{t('landing.exp3Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Game preview — phone mockup with map + sheet */}
      <section id="preview" className="px-4 py-16 bg-background">
        <div className="max-w-sm mx-auto">
          <h2 className="text-xl font-rubik font-bold text-center mb-2 text-brand-black">{t('landing.previewTitle')}</h2>
          <p className="text-sm text-brand-gray text-center mb-8 font-jakarta">{t('landing.previewSub')}</p>

          {/* Phone frame */}
          <div className="relative mx-auto rounded-[2rem] border-[6px] border-[#1a1a1a] bg-[#1a1a1a] shadow-2xl overflow-hidden" style={{ maxWidth: 320 }}>
            {/* Status bar */}
            <div className="flex items-center justify-between px-5 py-1.5 bg-[#1a1a1a] text-white/80 text-[10px] font-medium">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <span>●●●●</span>
                <span>🔋</span>
              </div>
            </div>

            {/* Map area — static SVG mock of Valenza streets with markers */}
            <div className="relative bg-[#e8e4da] overflow-hidden" style={{ height: 260 }}>
              {/* Street grid SVG — simplified Valenza centro */}
              <svg viewBox="0 0 320 260" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                {/* Background */}
                <rect width="320" height="260" fill="#e8e4da" />
                {/* Building blocks */}
                <rect x="20" y="30" width="80" height="55" rx="3" fill="#d4d0c6" />
                <rect x="120" y="15" width="95" height="70" rx="3" fill="#d4d0c6" />
                <rect x="235" y="25" width="65" height="50" rx="3" fill="#d4d0c6" />
                <rect x="30" y="115" width="70" height="50" rx="3" fill="#d4d0c6" />
                <rect x="130" y="110" width="85" height="60" rx="3" fill="#d4d0c6" />
                <rect x="240" y="100" width="60" height="55" rx="3" fill="#d4d0c6" />
                <rect x="15" y="195" width="90" height="50" rx="3" fill="#d4d0c6" />
                <rect x="135" y="200" width="75" height="45" rx="3" fill="#d4d0c6" />
                <rect x="230" y="185" width="70" height="60" rx="3" fill="#d4d0c6" />
                {/* Streets */}
                <line x1="0" y1="95" x2="320" y2="95" stroke="#ffffff" strokeWidth="6" />
                <line x1="0" y1="180" x2="320" y2="180" stroke="#ffffff" strokeWidth="6" />
                <line x1="115" y1="0" x2="115" y2="260" stroke="#ffffff" strokeWidth="5" />
                <line x1="225" y1="0" x2="225" y2="260" stroke="#ffffff" strokeWidth="5" />
                {/* Diagonal street */}
                <line x1="50" y1="0" x2="160" y2="260" stroke="#ffffff" strokeWidth="4" opacity="0.6" />
                {/* Piazza (open area) */}
                <rect x="125" y="80" width="90" height="25" rx="4" fill="#f0ece2" />
              </svg>

              {/* Location markers — orange circles like real game */}
              {/* Duomo — selected (green, in range) */}
              <div className="absolute" style={{ left: 155, top: 78 }}>
                <div className="w-8 h-8 rounded-full bg-green-500/30 flex items-center justify-center animate-pulse">
                  <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow" />
                </div>
              </div>
              {/* Piazza XXXI Martiri — visited (light orange) */}
              <div className="absolute" style={{ left: 100, top: 88 }}>
                <div className="w-3.5 h-3.5 rounded-full bg-orange-300 border-2 border-white shadow" />
              </div>
              {/* Consultorio — unvisited (dark orange) */}
              <div className="absolute" style={{ left: 215, top: 55 }}>
                <div className="w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-white shadow" />
              </div>
              {/* Workshop — unvisited */}
              <div className="absolute" style={{ left: 140, top: 135 }}>
                <div className="w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-white shadow" />
              </div>
              {/* Another location */}
              <div className="absolute" style={{ left: 245, top: 170 }}>
                <div className="w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-white shadow" />
              </div>

              {/* Player position — blue dot */}
              <div className="absolute" style={{ left: 148, top: 86 }}>
                <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
              </div>

              {/* Bottom bar overlay — matches real game */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-surface/90 backdrop-blur-sm text-xs text-brand-gray">
                <span>←</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> 1/5</span>
                <span>↻</span>
                <span>🎒</span>
                <span>⚙</span>
              </div>
            </div>

            {/* LocationSheet sliding up over map — matches real app exactly */}
            <div className="bg-surface rounded-t-2xl -mt-3 relative z-10">
              {/* Drag handle */}
              <div className="pt-3 flex justify-center">
                <div className="w-10 h-1 bg-brand-border rounded-full" />
              </div>

              {/* Image — 3:2 ratio */}
              <div className="px-3 pt-2">
                <div className="w-full aspect-[3/2] rounded-xl overflow-hidden bg-background">
                  <img
                    src="/images/adventure/default-location.webp"
                    alt={t('landing.previewLocationName')}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="px-4 pt-3 pb-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-base font-bold text-brand-black leading-tight">{t('landing.previewLocationName')}</h3>
                  <button className="p-1 rounded-full bg-background text-brand-gray shrink-0" aria-hidden="true">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="text-[13px] font-jakarta text-brand-text leading-relaxed mb-4">
                  {t('landing.previewNarr1')}
                  <strong className="font-semibold">{t('landing.previewNarrBold1')}</strong>
                  {t('landing.previewNarr2')}
                  <span className="text-brand-green-dark font-semibold">{t('landing.previewPlace1')}</span>
                  {t('landing.previewNarr3')}
                  <span className="text-brand-photinia font-bold">{t('landing.previewChar1')}</span>
                  {t('landing.previewNarr4')}
                </p>

                <p className="text-[9px] font-rubik font-bold text-brand-gray uppercase tracking-widest mb-2">{t('landing.previewChoiceLabel')}</p>
                <div className="flex flex-col gap-1.5">
                  <button className="w-full py-2.5 px-3 rounded-xl border-2 border-green-600 text-green-700 font-semibold text-[13px] text-left font-jakarta">
                    {t('landing.previewChoice1')}
                  </button>
                  <button className="w-full py-2.5 px-3 rounded-xl border-2 border-green-600 text-green-700 font-semibold text-[13px] text-left font-jakarta">
                    {t('landing.previewChoice2')}
                  </button>
                </div>
              </div>
            </div>

            {/* Home indicator */}
            <div className="flex justify-center py-2 bg-surface">
              <div className="w-28 h-1 bg-brand-border rounded-full" />
            </div>
          </div>

          <p className="text-xs text-brand-gray text-center mt-5 font-jakarta italic">{t('landing.previewDisclaimer')}</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16 bg-brand-photinia text-white text-center">
        <h2 className="text-2xl font-rubik font-bold mb-3">{t('landing.ctaTitle')}</h2>
        <p className="text-sm text-white/70 mb-6 font-jakarta">{t('landing.ctaSub')}</p>
        <Link
          href={isLoggedIn ? '/adventure' : '/login'}
          className="inline-block px-8 py-3.5 rounded-xl bg-white text-brand-photinia font-rubik font-bold text-sm hover:bg-brand-photinia-light transition-colors shadow-lg shadow-black/10"
        >
          {isLoggedIn ? t('nav.adventure') : t('landing.ctaButton')}
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 text-center text-xs text-brand-gray border-t border-brand-border space-y-2">
        <p className="font-rubik font-bold">vysi</p>
        <p className="font-jakarta italic">{t('landing.tagline')}</p>
        <div className="flex justify-center gap-4">
          <Link href="/privacy" className="hover:text-brand-green transition-colors">{t('auth.privacyPolicy')}</Link>
          <Link href="/terms" className="hover:text-brand-green transition-colors">{locale === 'it' ? 'Termini' : locale === 'es' ? 'Términos' : 'Terms'}</Link>
          <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? ''}`} className="hover:text-brand-green transition-colors">{process.env.NEXT_PUBLIC_CONTACT_EMAIL}</a>
        </div>
      </footer>
    </div>
  )
}
