import { ModuleManifest } from '@/config/modules'

const associationsManifest: ModuleManifest = {
  id: 'associations',
  name: 'Associations',
  isActive: true,
  navItem: {
    label: 'Associations',
    href: '/associations',
    icon: 'HeartHandshake',
  },
  // Browsing the directory is public (no permission). Only admins create/edit/
  // delete entries — `associations:manage` is NOT in the seed userAllowlist, so
  // regular users don't get it (admins bypass all checks anyway).
  permissions: ['associations:manage'],
  apiPrefix: '/api/associations',
  // RBAC tests fetch testEndpoint expecting 401 (no token) / 200 (any authed
  // user). The directory list is intentionally public, so point at the
  // auth-gated `manage` endpoint instead — it 401s without a token and 200s for
  // any logged-in user (returning whether they may manage entries).
  testEndpoint: '/api/associations/manage',
}

export default associationsManifest
