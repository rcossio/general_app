import { ModuleManifest } from '@/config/modules'

const adventureManifest: ModuleManifest = {
  id: 'adventure',
  name: 'Adventure',
  isActive: true,
  navItem: {
    label: 'Adventure',
    labelKey: 'nav.adventure',
    href: '/adventure',
    icon: 'Map',
  },
  permissions: [
    'adventure:play',
    'adventure:manage',
    'adventure:tester',
  ],
  apiPrefix: '/api/adventure',
  testEndpoint: '/api/adventure/games',
}

export default adventureManifest
