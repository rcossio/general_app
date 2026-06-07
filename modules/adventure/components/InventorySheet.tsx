'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { resolveI18n, type I18nString } from '@/lib/i18n'

export interface GameItem {
  id: string
  flag: string
  name: I18nString
  description?: I18nString | null
  itemImageUrl?: I18nString | null
}

interface InventorySheetProps {
  items: GameItem[]
  playerFlags: string[]
  // Item ids to mark as new (red dot + sorted to the top).
  newItemIds: Set<string>
  onClose: () => void
}

export function InventorySheet({ items, playerFlags, newItemIds, onClose }: InventorySheetProps) {
  const { t, locale } = useLocale()
  const [viewedItem, setViewedItem] = useState<GameItem | null>(null)
  const flagSet = new Set(playerFlags)
  // New items first; stable sort preserves the original game.items order within each group.
  const carried = items
    .filter((item) => flagSet.has(item.flag))
    .sort((a, b) => (newItemIds.has(b.id) ? 1 : 0) - (newItemIds.has(a.id) ? 1 : 0))

  if (viewedItem) {
    const src = resolveI18n(viewedItem.itemImageUrl, locale)
    const desc = resolveI18n(viewedItem.description, locale)
    const itemName = resolveI18n(viewedItem.name, locale)
    return (
      <div className="absolute inset-0 z-[2000] flex items-end">
        <div className="w-full bg-surface rounded-t-2xl shadow-2xl border-t border-brand-border max-h-[80vh] overflow-y-auto">
          <div className="pt-3 flex justify-center">
            <div className="w-10 h-1 bg-brand-border rounded-full" />
          </div>
          <div className="px-5 pt-3 pb-2 flex items-center gap-2">
            <button
              onClick={() => setViewedItem(null)}
              className="p-1.5 rounded-full hover:bg-brand-green-light text-brand-gray"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-base font-bold">{itemName}</h2>
          </div>
          <div className="px-4 pb-8">
            {src ? (
              <div className="w-full aspect-[3/2] md:aspect-auto md:h-64 rounded-xl overflow-hidden bg-background flex items-center justify-center">
                <img
                  src={src}
                  alt={itemName}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : desc ? (
              <p className="text-brand-text leading-relaxed text-sm">{desc}</p>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-[2000] flex items-end" onClick={onClose}>
      <div
        className="w-full bg-surface rounded-t-2xl shadow-2xl border-t border-brand-border max-h-[60vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-3 flex justify-center">
          <div className="w-10 h-1 bg-brand-border rounded-full" />
        </div>

        <div className="px-5 pt-4 pb-8">
          <h2 className="text-base font-bold mb-4">{t('adventure.inventory')}</h2>

          {carried.length === 0 ? (
            <p className="text-sm text-brand-gray italic">{t('adventure.inventoryEmpty')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {carried.map((item) => {
                const tappable = !!item.itemImageUrl || !!item.description
                const isNew = newItemIds.has(item.id)
                return (
                  <li
                    key={item.id}
                    onClick={tappable ? () => setViewedItem(item) : undefined}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl bg-background ${tappable ? 'cursor-pointer hover:bg-brand-green-light active:bg-brand-border' : ''}`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {isNew && (
                        <span className="w-2 h-2 rounded-full bg-brand-photinia shrink-0" aria-label="new" />
                      )}
                      <span className="text-sm font-medium truncate">{resolveI18n(item.name, locale)}</span>
                    </span>
                    {tappable && <ArrowLeft className="h-4 w-4 text-brand-gray rotate-180 shrink-0" />}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
