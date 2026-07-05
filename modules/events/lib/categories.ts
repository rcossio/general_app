// Event types (categories). Stored on the event as a free string key; the label
// is resolved via i18n (events.type.*). Adding/removing a type needs no
// migration — edit this list and the matching locale keys.
export interface EventType {
  key: string
  icon: string // lucide-react icon name
  labelKey: string
}

export const EVENT_TYPES: EventType[] = [
  { key: 'cultural', icon: 'Palette', labelKey: 'events.type.cultural' },
  { key: 'music', icon: 'Music', labelKey: 'events.type.music' },
  { key: 'sports', icon: 'Trophy', labelKey: 'events.type.sports' },
  { key: 'market', icon: 'ShoppingBasket', labelKey: 'events.type.market' },
  { key: 'community', icon: 'Users', labelKey: 'events.type.community' },
  { key: 'religious', icon: 'Church', labelKey: 'events.type.religious' },
  { key: 'other', icon: 'CalendarDays', labelKey: 'events.type.other' },
]

export const EVENT_TYPE_KEYS = EVENT_TYPES.map((t) => t.key)

const DEFAULT_TYPE: EventType = { key: 'other', icon: 'CalendarDays', labelKey: 'events.type.other' }

export function getEventType(key: string): EventType {
  return EVENT_TYPES.find((t) => t.key === key) ?? DEFAULT_TYPE
}
