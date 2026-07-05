import type { ActivityView } from './types'

export type ContactType = 'website' | 'facebook' | 'instagram' | 'email'

export interface PreferredContact {
  type: ContactType
  href: string
  icon: string // lucide-react icon name
  labelKey: string // activities.contact.*
}

// Preferred contact priority (associations kept their richer contacts on merge):
// website > facebook > instagram > email. Returns null when there's none.
export function preferredContact(a: ActivityView): PreferredContact | null {
  if (a.website) return { type: 'website', href: a.website, icon: 'Globe', labelKey: 'activities.contact.website' }
  if (a.facebook) return { type: 'facebook', href: a.facebook, icon: 'Facebook', labelKey: 'activities.contact.facebook' }
  if (a.instagram) return { type: 'instagram', href: a.instagram, icon: 'Instagram', labelKey: 'activities.contact.instagram' }
  if (a.email) return { type: 'email', href: `mailto:${a.email}`, icon: 'Mail', labelKey: 'activities.contact.email' }
  return null
}
