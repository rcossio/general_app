import { describe, it, expect } from 'vitest'
import { BASE, registerAndLogin, authHeaders } from './helpers'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!

async function loginAsAdmin(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  return (await res.json()).data?.accessToken as string
}

describe('Activities: public directory', () => {
  it('lists activities without auth', async () => {
    const res = await fetch(`${BASE}/api/activities`)
    expect(res.status).toBe(200)
    expect(Array.isArray((await res.json()).data.activities)).toBe(true)
  })
})

describe('Activities: manage endpoint (RBAC testEndpoint)', () => {
  it('401 without a token', async () => {
    expect((await fetch(`${BASE}/api/activities/manage`)).status).toBe(401)
  })
  it('200 canManage=false for a user, true for admin', async () => {
    const { accessToken } = await registerAndLogin('act-user')
    const u = await fetch(`${BASE}/api/activities/manage`, { headers: authHeaders(accessToken) })
    expect(u.status).toBe(200)
    expect((await u.json()).data.canManage).toBe(false)
    const a = await fetch(`${BASE}/api/activities/manage`, { headers: authHeaders(await loginAsAdmin()) })
    expect((await a.json()).data.canManage).toBe(true)
  })
})

describe('Activities: admin CRUD', () => {
  it('rejects create without token (401) and for a regular user (403)', async () => {
    const noAuth = await fetch(`${BASE}/api/activities`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X', category: 'food' }),
    })
    expect(noAuth.status).toBe(401)
    const { accessToken } = await registerAndLogin('act-noadmin')
    const forbidden = await fetch(`${BASE}/api/activities`, {
      method: 'POST', headers: authHeaders(accessToken),
      body: JSON.stringify({ name: 'Y', category: 'food' }),
    })
    expect(forbidden.status).toBe(403)
  })

  it('lets an admin create, update, and delete', async () => {
    const token = await loginAsAdmin()
    const name = `Test Activity ${Date.now()}`
    const create = await fetch(`${BASE}/api/activities`, {
      method: 'POST', headers: authHeaders(token),
      body: JSON.stringify({ name, category: 'sport', type: 'Gym', lat: 45, lng: 8.6 }),
    })
    expect(create.status).toBe(201)
    const created = (await create.json()).data.activity
    expect(created.category).toBe('sport')

    const list = (await (await fetch(`${BASE}/api/activities`)).json()).data.activities as { id: string }[]
    expect(list.some((a) => a.id === created.id)).toBe(true)

    const patch = await fetch(`${BASE}/api/activities/${created.id}`, {
      method: 'PATCH', headers: authHeaders(token),
      body: JSON.stringify({ category: 'wellness' }),
    })
    expect(patch.status).toBe(200)
    expect((await patch.json()).data.activity.category).toBe('wellness')

    expect((await fetch(`${BASE}/api/activities/${created.id}`, { method: 'DELETE', headers: authHeaders(token) })).status).toBe(200)
  })

  it('rejects an unknown category (400)', async () => {
    const token = await loginAsAdmin()
    const res = await fetch(`${BASE}/api/activities`, {
      method: 'POST', headers: authHeaders(token),
      body: JSON.stringify({ name: `Bad cat ${Date.now()}`, category: 'not-a-category' }),
    })
    expect(res.status).toBe(400)
  })
})
