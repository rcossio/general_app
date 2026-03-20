'use client'

import { useEffect } from 'react'
import { X, CheckCircle, Navigation } from 'lucide-react'

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
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    // Absolute overlay — sits inside the relative game container, above the map
    <div className="absolute inset-0 z-[2000] flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-gray-700 p-5 pb-8 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />

        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {visited && <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />}
              <h2 className="text-lg font-bold truncate">{name}</h2>
            </div>
            {distance !== null && !withinRange && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                {Math.round(distance)}m away
              </p>
            )}
            {withinRange && !visited && (
              <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                You are within range
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

        {narrative ? (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-5 text-sm">
            {narrative}
          </p>
        ) : (
          <p className="text-gray-400 italic text-sm mb-5">
            You haven&apos;t visited here yet. Get closer to unlock this location.
          </p>
        )}

        {!visited && withinRange && (
          <button
            onClick={onVisit}
            disabled={visiting}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold transition-colors"
          >
            {visiting ? 'Visiting...' : 'Visit this location'}
          </button>
        )}

        {visited && (
          <div className="py-3 rounded-xl bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-center text-sm font-medium">
            Already visited
          </div>
        )}
      </div>
    </div>
  )
}
