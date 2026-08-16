// Client-safe view type for the Activities module.
export interface ActivityView {
  id: string
  name: string
  category: string
  type: string | null
  address: string | null
  city: string | null
  phone: string | null
  notes: string | null
  website: string | null
  facebook: string | null
  instagram: string | null
  email: string | null
  lat: number | null
  lng: number | null
}
