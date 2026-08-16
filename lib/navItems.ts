import { activeModules } from '@/config/modules'

export interface NavItem {
  label: string
  href: string
  icon: string // lucide-react icon name
}

// Single source of truth for the app's primary navigation, shared by the
// desktop Sidebar and the mobile BottomNav so the item list, ordering, labels,
// and admin gating live in exactly one place. Each module contributes its own
// nav item (and translation key) from its manifest — adding a module needs no
// edit here. `t` is the translate function from useLocale(); `isAdmin` decides
// whether the Admin link is appended.
export function buildNavItems(t: (key: string) => string, isAdmin: boolean): NavItem[] {
  return [
    { label: t('nav.home'), href: '/dashboard', icon: 'Home' },
    ...activeModules.map((m) => ({
      label: t(m.navItem.labelKey),
      href: m.navItem.href,
      icon: m.navItem.icon,
    })),
    { label: t('nav.profile'), href: '/profile', icon: 'User' },
    ...(isAdmin ? [{ label: t('nav.admin'), href: '/admin', icon: 'Shield' }] : []),
  ]
}
