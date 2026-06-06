import { ModuleManifest } from '@/config/modules'

const communityManifest: ModuleManifest = {
  id: 'community',
  name: 'Community',
  isActive: true,
  navItem: {
    label: 'Community',
    href: '/community',
    icon: 'TriangleAlert',
  },
  // Reading the map is public (no permission). Creating and moderating are gated.
  permissions: ['community:create', 'community:moderate'],
  apiPrefix: '/api/community',
  testEndpoint: '/api/community/notices',
}

export default communityManifest
