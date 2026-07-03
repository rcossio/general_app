import adventure from '@/modules/adventure/manifest'
import community from '@/modules/community/manifest'
import associations from '@/modules/associations/manifest'

export interface ModuleNavItem {
  label: string
  href: string
  icon: string
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

export const activeModules: ModuleManifest[] = [community, adventure, associations].filter(
  (m) => m.isActive
)
