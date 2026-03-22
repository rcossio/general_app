import { ModuleManifest } from '@/config/modules'

const workoutManifest: ModuleManifest = {
  id: 'workout',
  name: 'Workout',
  isActive: true,
  navItem: {
    label: 'Workout',
    href: '/workout',
    icon: 'Dumbbell',
  },
  permissions: [
    'workout:read',
    'workout:create',
    'workout:update',
    'workout:delete',
  ],
  apiPrefix: '/api/workout',
  testEndpoint: '/api/workout/routines',
}

export default workoutManifest
