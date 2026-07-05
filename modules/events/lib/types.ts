// Client-safe view types for the Events module.

export interface EventView {
  id: string
  title: string
  type: string
  content: unknown // Tiptap document JSON
  images: string[] // ordered R2 object keys (carousel)
  startAt: string // ISO
  endAt: string | null
  locationLabel: string | null
  lat: number | null
  lng: number | null
  isOwner: boolean
}

// A row in the public feed / owner's list.
export interface EventSummary {
  id: string
  title: string
  type: string
  startAt: string
  endAt: string | null
  locationLabel: string | null
  image: string | null // first image key, if any
  isOwner: boolean
}

export interface EventQuota {
  usedThisWeek: number
  weeklyMax: number | null // null = unlimited
  canPost: boolean
  hasPendingRequest: boolean
}
