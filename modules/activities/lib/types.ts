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
  lat: number | null
  lng: number | null
}
