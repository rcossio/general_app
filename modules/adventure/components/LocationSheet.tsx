'use client'

import { useEffect, useState } from 'react'
import { X, Navigation } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

const DEFAULT_LOCATION_IMAGE = '/images/adventure/default-location.webp'
const DEFAULT_EVENT_IMAGE = '/images/adventure/default-event.webp'

interface LocationChoice {
  id: string
  label: string
}

interface LocationSheetProps {
  name: string
  type: string
  imageUrl: string | null
  narrative: string | null
  visited: boolean
  withinRange: boolean
  distance: number | null
  choices: LocationChoice[] | null
  hasPassword: boolean
  passwordWrong: boolean
  locked: boolean
  onVisit: () => void
  onChoose: (choiceId: string) => void
  onPassword: (password: string) => void
  onClose: () => void
  visiting: boolean
}

export function LocationSheet({
  name,
  type,
  imageUrl,
  narrative,
  visited,
  withinRange,
  distance,
  choices,
  hasPassword,
  passwordWrong,
  locked,
  onVisit,
  onChoose,
  onPassword,
  onClose,
  visiting,
}: LocationSheetProps) {
  const { t } = useLocale()
  const [passwordInput, setPasswordInput] = useState('')

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !locked) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, locked])

  function renderNarrative(text: string) {
    const parts = text.split(/\*\*(.+?)\*\*/g)
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    )
  }

  const hasChoices = withinRange && !visited && choices && choices.length > 0
  const showPassword = hasPassword && withinRange
  const src = imageUrl ?? (type === 'event' ? DEFAULT_EVENT_IMAGE : DEFAULT_LOCATION_IMAGE)

  return (
    <div className="absolute inset-0 z-[2000] flex items-end" onClick={locked ? undefined : onClose}>
      <div
        className="w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="pt-3 flex justify-center">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Image — 3:2 ratio on mobile, fixed height on desktop */}
        <div className="px-4 pt-3">
          <div className="w-full aspect-[3/2] md:aspect-auto md:h-48 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img
              src={src}
              alt={name}
              loading="lazy"
              className="w-full h-full object-cover md:object-contain"
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pt-4 pb-8">
          {/* Title + close */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">{name}</h2>
              {distance !== null && !withinRange && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                  <Navigation className="h-3 w-3" />
                  {Math.round(distance)}m
                </p>
              )}
            </div>
            {!locked && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Narrative + actions */}
          {withinRange || visited ? (
            visiting ? (
              <p className="text-gray-400 italic text-sm">...</p>
            ) : (
              <>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm mb-4">
                  {narrative ? renderNarrative(narrative) : null}
                </p>
                {passwordWrong ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-red-500 text-sm font-medium">{t('adventure.wrongPassword')}</p>
                    <button
                      onClick={onClose}
                      className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm"
                    >
                      {t('adventure.visitLocation')}
                    </button>
                  </div>
                ) : showPassword ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder={t('adventure.passwordPrompt')}
                      maxLength={20}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={() => { onPassword(passwordInput); setPasswordInput('') }}
                      disabled={!passwordInput || visiting}
                      className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold text-sm"
                    >
                      {t('adventure.passwordConfirm')}
                    </button>
                  </div>
                ) : hasChoices ? (
                  <>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      {t('adventure.chooseAction')}
                    </p>
                    <div className="flex flex-col gap-2">
                      {choices!.map((choice) => (
                        <button
                          key={choice.id}
                          onClick={() => onChoose(choice.id)}
                          className="w-full py-3 px-4 rounded-xl border-2 border-green-600 text-green-700 dark:text-green-400 font-semibold text-sm text-left hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                        >
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : withinRange ? (
                  <button
                    onClick={onVisit}
                    className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm"
                  >
                    {t('adventure.visitLocation')}
                  </button>
                ) : null}
              </>
            )
          ) : (
            <p className="text-gray-400 italic text-sm">
              {t('adventure.outOfRange')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
