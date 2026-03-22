// import workout from '@/modules/workout/manifest'
import lifeTracker from '@/modules/life-tracker/manifest'
import adventure from '@/modules/adventure/manifest'
// import events from '@/modules/events/manifest'  // commented = disconnected

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

export const activeModules: ModuleManifest[] = [lifeTracker, adventure].filter(
  (m) => m.isActive
)
