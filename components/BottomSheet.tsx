'use client'

import type { ReactNode } from 'react'

interface BottomSheetProps {
  // Backdrop click handler. Pass undefined to make the sheet non-dismissible
  // by tapping outside (e.g. a locked adventure event).
  onClose?: () => void
  // Stacking order. Detail sheets use 2000; a form sheet layered above a detail
  // sheet uses 2100.
  zIndex?: number
  // When set, the panel scrolls internally and is capped at this height
  // (e.g. '80vh').
  maxHeight?: string
  // Apply the standard p-5 pb-8 padding. Turn off for sheets that manage their
  // own inner padding (e.g. LocationSheet).
  padded?: boolean
  // Extra classes appended to the panel.
  className?: string
  children: ReactNode
}

// The one bottom-sheet scaffold used across the app: a full-screen overlay with
// a panel docked to the bottom, tap-outside-to-close, and stopPropagation on the
// panel. Positioning is `absolute` (never `fixed`/portals) on purpose — on iOS
// Safari a `fixed` overlay or a portal gets clipped by the Leaflet map container
// on the map pages. Keeping that rule in ONE component means new sheets can't
// accidentally break it.
export function BottomSheet({
  onClose,
  zIndex = 2000,
  maxHeight,
  padded = true,
  className = '',
  children,
}: BottomSheetProps) {
  const panelClasses = [
    'w-full bg-surface rounded-t-2xl shadow-2xl border-t border-brand-border',
    padded ? 'p-5 pb-8' : '',
    maxHeight ? 'overflow-y-auto' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="absolute inset-0 flex items-end" style={{ zIndex }} onClick={onClose}>
      <div className={panelClasses} style={maxHeight ? { maxHeight } : undefined} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
