'use client'

import { useEffect } from 'react'
import { X, Navigation } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

interface LocationSheetProps {
  name: string
  narrative: string | null
  visited: boolean
  withinRange: boolean
  distance: number | null
  onVisit: () => void
  onClose: () => void
  visiting: boolean
}

export function LocationSheet({
  name,
  narrative,
  visited,
  withinRange,
  distance,
  onVisit,
  onClose,
  visiting,
}: LocationSheetProps) {
  const { t } = useLocale()
  useEffect(() => {
    if (withinRange) onVisit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="absolute inset-0 z-[2000] flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-gray-700 p-5 pb-8 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />

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
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {withinRange || visited ? (
          visiting ? (
            <p className="text-gray-400 italic text-sm">...</p>
          ) : (
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
              {narrative}
            </p>
          )
        ) : (
          <p className="text-gray-400 italic text-sm">
            {t('adventure.outOfRange')}
          </p>
        )}
      </div>
    </div>
  )
}
