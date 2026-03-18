import { execSync } from 'child_process'

export async function setup() {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL!
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-chars-long'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-chars-long'
  process.env.JWT_ACCESS_EXPIRES_IN = '15m'
  process.env.JWT_REFRESH_EXPIRES_IN = '30d'

  // Run migrations on test DB
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'inherit',
  })
}

export async function teardown() {
  // no-op
}
