// Activity categories — the single source of truth for classification + map
// marker colour. The DB stores the `key`; labels are i18n (activities.cat.*).
// Adding a category needs no migration: add it here + the locale keys.
export interface ActivityCategory {
  key: string
  color: string // hex — the map marker colour for this category
  labelKey: string
}

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  { key: 'food', color: '#e0655a', labelKey: 'activities.cat.food' },
  { key: 'sport', color: '#2563eb', labelKey: 'activities.cat.sport' },
  { key: 'martial', color: '#7c3aed', labelKey: 'activities.cat.martial' },
  { key: 'dance', color: '#db2777', labelKey: 'activities.cat.dance' },
  { key: 'music', color: '#d97706', labelKey: 'activities.cat.music' },
  { key: 'goldsmith', color: '#b45309', labelKey: 'activities.cat.goldsmith' },
  { key: 'culture', color: '#0891b2', labelKey: 'activities.cat.culture' },
  { key: 'outdoors', color: '#16a34a', labelKey: 'activities.cat.outdoors' },
  { key: 'wellness', color: '#14b8a6', labelKey: 'activities.cat.wellness' },
  // Associations, merged in as two classes:
  { key: 'formal', color: '#4f46e5', labelKey: 'activities.cat.formal' },
  { key: 'informal', color: '#a855f7', labelKey: 'activities.cat.informal' },
  { key: 'niche', color: '#64748b', labelKey: 'activities.cat.niche' },
  { key: 'event', color: '#ea580c', labelKey: 'activities.cat.event' },
]

export const ACTIVITY_CATEGORY_KEYS = ACTIVITY_CATEGORIES.map((c) => c.key)

const DEFAULT_CATEGORY: ActivityCategory = { key: 'other', color: '#94a3b8', labelKey: 'activities.cat.other' }

export function getActivityCategory(key: string): ActivityCategory {
  return ACTIVITY_CATEGORIES.find((c) => c.key === key) ?? DEFAULT_CATEGORY
}
