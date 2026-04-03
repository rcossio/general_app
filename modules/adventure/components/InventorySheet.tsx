'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

type I18nString = string | Record<string, string>

function resolveI18n(value: I18nString | null | undefined, locale: string): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale] ?? Object.values(value)[0] ?? ''
}

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
  onClose: () => void
}

export function InventorySheet({ items, playerFlags, onClose }: InventorySheetProps) {
  const { t, locale } = useLocale()
  const [viewedItem, setViewedItem] = useState<GameItem | null>(null)
  const flagSet = new Set(playerFlags)
  const carried = items.filter((item) => flagSet.has(item.flag))

  if (viewedItem) {
    const src = resolveI18n(viewedItem.itemImageUrl, locale)
    const desc = resolveI18n(viewedItem.description, locale)
    const itemName = resolveI18n(viewedItem.name, locale)
    return (
      <div className="absolute inset-0 z-[2000] flex items-end">
        <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-y-auto">
          <div className="pt-3 flex justify-center">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
          <div className="px-5 pt-3 pb-2 flex items-center gap-2">
            <button
              onClick={() => setViewedItem(null)}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-base font-bold">{itemName}</h2>
          </div>
          <div className="px-4 pb-8">
            {src ? (
              <div className="w-full aspect-[3/2] md:aspect-auto md:h-64 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <img
                  src={src}
                  alt={itemName}
                  onError={(e) => { e.currentTarget.src = '/images/adventure/default_item.webp' }}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : desc ? (
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">{desc}</p>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-[2000] flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-gray-700 max-h-[60vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-3 flex justify-center">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        <div className="px-5 pt-4 pb-8">
          <h2 className="text-base font-bold mb-4">{t('adventure.inventory')}</h2>

          {carried.length === 0 ? (
            <p className="text-sm text-gray-400 italic">{t('adventure.inventoryEmpty')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {carried.map((item) => {
                const tappable = !!item.itemImageUrl || !!item.description
                return (
                  <li
                    key={item.id}
                    onClick={tappable ? () => setViewedItem(item) : undefined}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 ${tappable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200' : ''}`}
                  >
                    <span className="text-sm font-medium">{resolveI18n(item.name, locale)}</span>
                    {tappable && <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180" />}
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
