import { ModuleManifest } from '@/config/modules'

const activitiesManifest: ModuleManifest = {
  id: 'activities',
  name: 'Activities',
  isActive: true,
  navItem: {
    label: 'Activities',
    labelKey: 'nav.activities',
    href: '/activities',
    icon: 'MapPinned',
  },
  // Browsing is public (map + list). Only admins create/edit/delete
  // (activities:manage — NOT in the seed userAllowlist).
  permissions: ['activities:manage'],
  apiPrefix: '/api/activities',
  // testEndpoint: 401 without a token, 200 for any authed user (returns canManage).
  testEndpoint: '/api/activities/manage',
}

export default activitiesManifest
