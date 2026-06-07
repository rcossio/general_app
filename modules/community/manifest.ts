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
  // RBAC tests fetch testEndpoint with GET expecting 401 (no token) / 200 (any
  // authed user). The notices list is intentionally public, so point at the
  // auth-gated quota endpoint instead — that's what exercises the module's RBAC.
  testEndpoint: '/api/community/notices/quota',
}

export default communityManifest
