import { ModuleManifest } from '@/config/modules'

const lifeTrackerManifest: ModuleManifest = {
  id: 'life-tracker',
  name: 'Life Tracker',
  isActive: true,
  navItem: {
    label: 'Tracker',
    href: '/tracker',
    icon: 'BarChart2',
  },
  permissions: [
    'tracker:read',
    'tracker:create',
    'tracker:update',
    'tracker:delete',
    'tracker:manage',
  ],
  apiPrefix: '/api/tracker',
}

export default lifeTrackerManifest
