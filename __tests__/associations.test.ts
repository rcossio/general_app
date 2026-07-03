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
  const body = await res.json()
  return body.data?.accessToken as string
}

describe('Associations: public directory', () => {
  it('lists associations without authentication', async () => {
    const res = await fetch(`${BASE}/api/associations`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data?.associations)).toBe(true)
  })
})

describe('Associations: manage endpoint (RBAC testEndpoint)', () => {
  it('401 without a token', async () => {
    const res = await fetch(`${BASE}/api/associations/manage`)
    expect(res.status).toBe(401)
  })

  it('200 with canManage=false for a regular user', async () => {
    const { accessToken } = await registerAndLogin('assoc-user')
    const res = await fetch(`${BASE}/api/associations/manage`, { headers: authHeaders(accessToken) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data?.canManage).toBe(false)
  })

  it('200 with canManage=true for an admin', async () => {
    const token = await loginAsAdmin()
    const res = await fetch(`${BASE}/api/associations/manage`, { headers: authHeaders(token) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data?.canManage).toBe(true)
  })
})

describe('Associations: admin CRUD', () => {
  it('rejects create without a token (401)', async () => {
    const res = await fetch(`${BASE}/api/associations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'No Auth Assoc' }),
    })
    expect(res.status).toBe(401)
  })

  it('forbids create for a regular user (403)', async () => {
    const { accessToken } = await registerAndLogin('assoc-noadmin')
    const res = await fetch(`${BASE}/api/associations`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ name: 'Forbidden Assoc' }),
    })
    expect(res.status).toBe(403)
  })

  it('lets an admin create, update, and delete an entry', async () => {
    const token = await loginAsAdmin()
    const name = `Test Assoc ${Date.now()}`

    // Create
    const createRes = await fetch(`${BASE}/api/associations`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ name, website: 'https://example.com', lat: 45, lng: 8.6 }),
    })
    expect(createRes.status).toBe(201)
    const created = (await createRes.json()).data.association
    expect(created.name).toBe(name)
    expect(created.website).toBe('https://example.com')

    // Appears in the public list
    const listRes = await fetch(`${BASE}/api/associations`)
    const list = (await listRes.json()).data.associations as { id: string }[]
    expect(list.some((a) => a.id === created.id)).toBe(true)

    // Update
    const patchRes = await fetch(`${BASE}/api/associations/${created.id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ facebook: 'https://facebook.com/test' }),
    })
    expect(patchRes.status).toBe(200)
    const updated = (await patchRes.json()).data.association
    expect(updated.facebook).toBe('https://facebook.com/test')

    // Delete
    const delRes = await fetch(`${BASE}/api/associations/${created.id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    })
    expect(delRes.status).toBe(200)
  })

  it('rejects invalid URLs (400)', async () => {
    const token = await loginAsAdmin()
    const res = await fetch(`${BASE}/api/associations`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ name: `Bad URL ${Date.now()}`, website: 'not-a-url' }),
    })
    expect(res.status).toBe(400)
  })
})
