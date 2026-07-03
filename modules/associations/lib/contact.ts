// Client-safe helpers for the Associations module. No server imports here — this
// is used by both the map component and the detail sheet.

export interface AssociationView {
  id: string
  name: string
  description: string | null
  website: string | null
  facebook: string | null
  instagram: string | null
  email: string | null
  phone: string | null
  address: string | null
  lat: number | null
  lng: number | null
}

export type ContactType = 'website' | 'facebook' | 'instagram' | 'email'

export interface PreferredContact {
  type: ContactType
  value: string // raw value (URL or email address)
  href: string // ready-to-use href (mailto: for email)
  icon: string // lucide-react icon name
  labelKey: string // i18n key (associations.contact.*)
}

// The user's requested priority: website > facebook > instagram > email.
// Returns null when the association has no contact channel at all.
export function preferredContact(a: AssociationView): PreferredContact | null {
  if (a.website) {
    return { type: 'website', value: a.website, href: a.website, icon: 'Globe', labelKey: 'associations.contact.website' }
  }
  if (a.facebook) {
    return { type: 'facebook', value: a.facebook, href: a.facebook, icon: 'Facebook', labelKey: 'associations.contact.facebook' }
  }
  if (a.instagram) {
    return { type: 'instagram', value: a.instagram, href: a.instagram, icon: 'Instagram', labelKey: 'associations.contact.instagram' }
  }
  if (a.email) {
    return { type: 'email', value: a.email, href: `mailto:${a.email}`, icon: 'Mail', labelKey: 'associations.contact.email' }
  }
  return null
}
