import { prisma } from '../../lib/prisma'
import { afterEach } from 'vitest'

afterEach(async () => {
  // Clean tables between tests in reverse FK order
  await prisma.refreshToken.deleteMany()
  await prisma.trackerEntry.deleteMany()
  await prisma.workoutExercise.deleteMany()
  await prisma.workoutDay.deleteMany()
  await prisma.workoutRoutine.deleteMany()
  await prisma.rolePermission.deleteMany()
  await prisma.userRole.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.user.deleteMany()
  await prisma.role.deleteMany()
})
