// Single source of truth for community notice categories.
//
// To change categories: edit this array (and add the matching `community.cat.*`
// keys to locales/{en,it,es}.ts). The DB stores `category` as a free string, so
// adding/removing categories needs NO migration. Notices whose category is no
// longer in this list fall back to a default icon/label (see getCategory).

export interface NoticeCategory {
  key: string // stored in the DB
  icon: string // lucide-react icon name
  labelKey: string // i18n key (community.cat.*)
}

export const NOTICE_CATEGORIES: NoticeCategory[] = [
  { key: 'green', icon: 'Sprout', labelKey: 'community.cat.green' },
  { key: 'litter', icon: 'Trash2', labelKey: 'community.cat.litter' },
  { key: 'furniture', icon: 'Armchair', labelKey: 'community.cat.furniture' },
  { key: 'other', icon: 'CircleAlert', labelKey: 'community.cat.other' },
]

// Categories that require a note (free text) when reporting.
export const NOTE_REQUIRED_CATEGORIES = ['other']

export const NOTICE_CATEGORY_KEYS = NOTICE_CATEGORIES.map((c) => c.key)

const DEFAULT_CATEGORY: NoticeCategory = {
  key: 'unknown',
  icon: 'CircleAlert',
  labelKey: 'community.cat.unknown',
}

export function getCategory(key: string): NoticeCategory {
  return NOTICE_CATEGORIES.find((c) => c.key === key) ?? DEFAULT_CATEGORY
}
