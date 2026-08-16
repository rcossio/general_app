import { ModuleManifest } from '@/config/modules'

const eventsManifest: ModuleManifest = {
  id: 'events',
  name: 'Events',
  isActive: true,
  navItem: {
    label: 'Events',
    labelKey: 'nav.events',
    href: '/events',
    icon: 'CalendarDays',
  },
  // events:create is in the seed allowlist (every user, subject to the weekly
  // cap). events:unlimited is admin-grant only (via the admin panel, on
  // approving a request) and lifts the cap. Reading the feed is public.
  permissions: ['events:create', 'events:unlimited'],
  apiPrefix: '/api/events',
  // GET /api/events/quota returns the caller's weekly usage: 401 without a
  // token, 200 for any authed user — the RBAC test contract.
  testEndpoint: '/api/events/quota',
}

export default eventsManifest
