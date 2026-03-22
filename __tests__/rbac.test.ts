import { describe, it, expect } from 'vitest'
import { BASE, registerAndLogin, authHeaders } from './helpers'
import { activeModules } from '../config/modules'

// Admin credentials come from the environment (same as the seeded master_admin)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!

const moduleEndpoints = activeModules.map((m) => m.testEndpoint)

async function loginAsAdmin() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  const body = await res.json()
  return body.data?.accessToken as string
}

describe('RBAC: Unauthenticated', () => {
  it('returns 401 on protected endpoints with no token', async () => {
    const endpoints = ['/api/auth/me', '/api/admin/users', ...moduleEndpoints]
    for (const endpoint of endpoints) {
      const res = await fetch(`${BASE}${endpoint}`)
      expect(res.status, `${endpoint} should be 401`).toBe(401)
    }
  })
})

describe('RBAC: Regular user', () => {
  it('can access own data endpoints', async () => {
    const { accessToken } = await registerAndLogin('rbac-user')
    const endpoints = ['/api/auth/me', ...moduleEndpoints]
    for (const endpoint of endpoints) {
      const res = await fetch(`${BASE}${endpoint}`, { headers: authHeaders(accessToken) })
      expect(res.status, `${endpoint} should be 200`).toBe(200)
    }
  })

  it('cannot access admin endpoints (403)', async () => {
    const { accessToken } = await registerAndLogin('rbac-noadmin')
    const res = await fetch(`${BASE}/api/admin/users`, { headers: authHeaders(accessToken) })
    expect(res.status).toBe(403)
  })
})

describe('RBAC: Admin', () => {
  it('can access admin endpoints', async () => {
    const adminToken = await loginAsAdmin()
    const res = await fetch(`${BASE}/api/admin/users`, { headers: authHeaders(adminToken) })
    expect(res.status).toBe(200)
  })

  it('can access all regular endpoints', async () => {
    const adminToken = await loginAsAdmin()
    const endpoints = ['/api/auth/me', ...moduleEndpoints]
    for (const endpoint of endpoints) {
      const res = await fetch(`${BASE}${endpoint}`, { headers: authHeaders(adminToken) })
      expect(res.status, `${endpoint} should be 200`).toBe(200)
    }
  })
})
