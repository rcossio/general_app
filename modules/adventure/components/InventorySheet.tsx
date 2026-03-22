'use client'

import { useLocale } from '@/contexts/LocaleContext'

type I18nString = string | Record<string, string>

function resolveI18n(value: I18nString | null | undefined, locale: string): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale] ?? value['en'] ?? ''
}

export interface GameItem {
  id: string
  flag: string
  name: I18nString
  imageUrl: string | null
}

interface InventorySheetProps {
  items: GameItem[]
  playerFlags: string[]
  onClose: () => void
}

export function InventorySheet({ items, playerFlags, onClose }: InventorySheetProps) {
  const { t, locale } = useLocale()
  const flagSet = new Set(playerFlags)
  const carried = items.filter((item) => flagSet.has(item.flag))

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
              {carried.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800"
                >
                  <span className="text-sm font-medium">{resolveI18n(item.name, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
