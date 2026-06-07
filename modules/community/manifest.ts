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
  // community:tester is admin-granted (not in the user allowlist) — unlocks the
  // time-simulation slider for non-admin testers.
  permissions: ['community:create', 'community:moderate', 'community:tester'],
  apiPrefix: '/api/community',
  testEndpoint: '/api/community/notices',
}

export default communityManifest
