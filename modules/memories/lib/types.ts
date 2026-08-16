// Client-safe view types (no tiptap/prisma imports) shared by the pages/hooks.

export interface MemorialPostView {
  id: string
  content: unknown // Tiptap document JSON
  images: string[] // ordered R2 object keys (carousel)
  locationLabel: string | null
  lat: number | null
  lng: number | null
  position: number
}

export interface MemorialProfileView {
  id: string
  name: string
  subtitle: string | null
  slug: string
  facebook: string | null
  instagram: string | null
  tiktok: string | null
  posts: MemorialPostView[]
  isOwner: boolean
}

// A row in the owner's "My memorials" list.
export interface MemorialSummary {
  id: string
  name: string
  subtitle: string | null
  slug: string
  postCount: number
}
