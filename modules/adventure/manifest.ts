import { ModuleManifest } from '@/config/modules'

const adventureManifest: ModuleManifest = {
  id: 'adventure',
  name: 'Adventure',
  isActive: true,
  navItem: {
    label: 'Adventure',
    href: '/adventure',
    icon: 'Map',
  },
  permissions: [
    'adventure:play',
    'adventure:manage',
  ],
  apiPrefix: '/api/adventure',
}

export default adventureManifest
