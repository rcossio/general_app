import adventure from '@/modules/adventure/manifest'
import community from '@/modules/community/manifest'
import memories from '@/modules/memories/manifest'
import events from '@/modules/events/manifest'
import activities from '@/modules/activities/manifest'

export interface ModuleNavItem {
  label: string // English default / fallback
  labelKey: string // i18n key resolved by the nav (see lib/navItems.ts)
  href: string
  icon: string // lucide-react icon name
}

export interface ModuleManifest {
  id: string
  name: string
  isActive: boolean
  navItem: ModuleNavItem
  permissions: string[]
  apiPrefix: string
  testEndpoint: string
}

export const activeModules: ModuleManifest[] = [community, adventure, memories, events, activities].filter(
  (m) => m.isActive
)
