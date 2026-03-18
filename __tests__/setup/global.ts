import path from 'path'

export async function setup() {
  // Load .env so ADMIN_EMAIL, ADMIN_PASSWORD, NEXT_PUBLIC_APP_URL are available in tests
  process.loadEnvFile(path.resolve(__dirname, '../../.env'))
}

export async function teardown() {}
