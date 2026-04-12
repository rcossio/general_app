import path from 'path'
import { PrismaClient } from '@prisma/client'

export async function setup() {
  // Load .env so ADMIN_EMAIL, ADMIN_PASSWORD, NEXT_PUBLIC_APP_URL are available in tests
  process.loadEnvFile(path.resolve(__dirname, '../../.env'))
}

export async function teardown() {
  // Clean up test users created during test runs
  const prisma = new PrismaClient()
  try {
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@smoke.invalid' } },
    })
  } finally {
    await prisma.$disconnect()
  }
}
