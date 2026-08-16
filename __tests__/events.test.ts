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

const DOC = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Come join us.' }] }] }

function eventBody(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Test Event',
    type: 'community',
    content: DOC,
    images: [],
    startAt: new Date(Date.now() + 86_400_000).toISOString(),
    ...overrides,
  }
}

async function createEvent(token: string, overrides = {}) {
  return fetch(`${BASE}/api/events`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(eventBody(overrides)) })
}

describe('Events: quota', () => {
  it('401 without a token', async () => {
    const res = await fetch(`${BASE}/api/events/quota`)
    expect(res.status).toBe(401)
  })
  it('200 with the weekly quota for a fresh user', async () => {
    const { accessToken } = await registerAndLogin('ev-quota')
    const res = await fetch(`${BASE}/api/events/quota`, { headers: authHeaders(accessToken) })
    expect(res.status).toBe(200)
    const q = (await res.json()).data
    expect(q.weeklyMax).toBe(1)
    expect(q.canPost).toBe(true)
  })
})

describe('Events: create + weekly cap', () => {
  it('requires auth', async () => {
    const res = await fetch(`${BASE}/api/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eventBody()) })
    expect(res.status).toBe(401)
  })

  it('lets a user publish once, then caps the second within the week', async () => {
    const { accessToken } = await registerAndLogin('ev-cap')
    const first = await createEvent(accessToken)
    expect(first.status).toBe(201)
    const second = await createEvent(accessToken)
    expect(second.status).toBe(429)
    expect((await second.json()).code).toBe('RATE_LIMIT_WEEKLY')
  })

  it('rejects an invalid type', async () => {
    const { accessToken } = await registerAndLogin('ev-badtype')
    const res = await createEvent(accessToken, { type: 'not-a-type' })
    expect(res.status).toBe(400)
  })

  it('lets an admin publish repeatedly (no cap)', async () => {
    const token = await loginAsAdmin()
    expect((await createEvent(token)).status).toBe(201)
    expect((await createEvent(token)).status).toBe(201)
  })
})

describe('Events: public read + ownership', () => {
  it('lists publicly and serves a single event without leaking userId', async () => {
    const owner = await registerAndLogin('ev-pub')
    const id = (await (await createEvent(owner.accessToken, { title: 'Public Fair' })).json()).data.id

    const feed = await fetch(`${BASE}/api/events`)
    expect(feed.status).toBe(200)
    expect(Array.isArray((await feed.json()).data.events)).toBe(true)

    const anon = await fetch(`${BASE}/api/events/${id}`)
    const anonEvent = (await anon.json()).data.event
    expect(anonEvent.title).toBe('Public Fair')
    expect(anonEvent.isOwner).toBe(false)
    expect('userId' in anonEvent).toBe(false)

    const mine = await fetch(`${BASE}/api/events/${id}`, { headers: authHeaders(owner.accessToken) })
    expect((await mine.json()).data.event.isOwner).toBe(true)

    expect((await fetch(`${BASE}/api/events/does-not-exist`)).status).toBe(404)
  })

  it('only owner or admin can edit/delete', async () => {
    const owner = await registerAndLogin('ev-edit')
    const other = await registerAndLogin('ev-other')
    const id = (await (await createEvent(owner.accessToken)).json()).data.id

    const forbidden = await fetch(`${BASE}/api/events/${id}`, { method: 'PATCH', headers: authHeaders(other.accessToken), body: JSON.stringify(eventBody({ title: 'Hacked' })) })
    expect(forbidden.status).toBe(403)

    const ok = await fetch(`${BASE}/api/events/${id}`, { method: 'PATCH', headers: authHeaders(owner.accessToken), body: JSON.stringify(eventBody({ title: 'Updated' })) })
    expect(ok.status).toBe(200)

    // Admin can edit someone else's event.
    const adminToken = await loginAsAdmin()
    const adminEdit = await fetch(`${BASE}/api/events/${id}`, { method: 'PATCH', headers: authHeaders(adminToken), body: JSON.stringify(eventBody({ title: 'Admin edit' })) })
    expect(adminEdit.status).toBe(200)

    const del = await fetch(`${BASE}/api/events/${id}`, { method: 'DELETE', headers: authHeaders(owner.accessToken) })
    expect(del.status).toBe(200)
  })
})

describe('Events: quota requests + admin review', () => {
  it('user submits a request (idempotent); admin sees and approves it', async () => {
    const { accessToken } = await registerAndLogin('ev-req')

    const noAuth = await fetch(`${BASE}/api/events/requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    expect(noAuth.status).toBe(401)

    const first = await fetch(`${BASE}/api/events/requests`, { method: 'POST', headers: authHeaders(accessToken), body: JSON.stringify({ message: 'Organising a festival' }) })
    expect(first.status).toBe(201)
    // Idempotent: a second request while one is pending doesn't error.
    const second = await fetch(`${BASE}/api/events/requests`, { method: 'POST', headers: authHeaders(accessToken), body: '{}' })
    expect(second.status).toBe(200)

    // Admin queue lists it.
    const adminToken = await loginAsAdmin()
    const list = await fetch(`${BASE}/api/admin/event-requests`, { headers: authHeaders(adminToken) })
    expect(list.status).toBe(200)
    const reqs = (await list.json()).data.requests as { id: string; user: { email: string } }[]
    const mine = reqs.find((r) => r.user.email.startsWith('ev-req'))
    expect(mine).toBeTruthy()

    // Non-admin can't view the queue.
    expect((await fetch(`${BASE}/api/admin/event-requests`, { headers: authHeaders(accessToken) })).status).toBe(403)

    // Approve, then a second review is rejected.
    const approve = await fetch(`${BASE}/api/admin/event-requests/${mine!.id}`, { method: 'POST', headers: authHeaders(adminToken), body: JSON.stringify({ action: 'approve' }) })
    expect(approve.status).toBe(200)
    const again = await fetch(`${BASE}/api/admin/event-requests/${mine!.id}`, { method: 'POST', headers: authHeaders(adminToken), body: JSON.stringify({ action: 'approve' }) })
    expect(again.status).toBe(400)
  })
})

describe('Events: image upload URL', () => {
  it('401 without a token, 200 with an events/ key', async () => {
    expect((await fetch(`${BASE}/api/events/upload-url`, { method: 'POST' })).status).toBe(401)
    const { accessToken } = await registerAndLogin('ev-upload')
    const res = await fetch(`${BASE}/api/events/upload-url`, { method: 'POST', headers: authHeaders(accessToken) })
    expect(res.status).toBe(200)
    expect((await res.json()).data.key).toMatch(/^events\/[0-9a-f-]+\.jpg$/)
  })
})
