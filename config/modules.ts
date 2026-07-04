import adventure from '@/modules/adventure/manifest'
import community from '@/modules/community/manifest'
import associations from '@/modules/associations/manifest'
import memories from '@/modules/memories/manifest'

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

export const activeModules: ModuleManifest[] = [community, adventure, associations, memories].filter(
  (m) => m.isActive
)
