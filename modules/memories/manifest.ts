import { ModuleManifest } from '@/config/modules'

const memoriesManifest: ModuleManifest = {
  id: 'memories',
  name: 'Memories',
  isActive: true,
  navItem: {
    label: 'Memories',
    labelKey: 'nav.memories',
    href: '/memories',
    icon: 'Flower2',
  },
  // Any logged-in user can create a memorial (memories:create is in the seed
  // userAllowlist). Public profile pages need no permission; editing is
  // owner-scoped inside the routes, not permission-based.
  permissions: ['memories:create'],
  apiPrefix: '/api/memories',
  // GET /api/memories lists the caller's own memorials: 401 without a token,
  // 200 for any authenticated user — the RBAC test contract.
  testEndpoint: '/api/memories',
}

export default memoriesManifest
