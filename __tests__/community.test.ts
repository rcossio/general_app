import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { BASE, registerAndLogin, authHeaders } from './helpers'

// Admin credentials come from the environment (the seeded master_admin).
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!

// A well-formed R2 key matching what the upload-url endpoint mints
// (`community/<uuid>.jpg`). No real upload needed — the endpoint stores
// getPublicUrl(key) and validates the shape.
const photoKey = () => `community/${randomUUID()}.jpg`

async function loginAsAdmin(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  const body = await res.json()
  return body.data?.accessToken as string
}

function createNotice(token: string, overrides: Record<string, unknown> = {}) {
  return fetch(`${BASE}/api/community/notices`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ category: 'green', lat: 45.07, lng: 7.68, photoKey: photoKey(), ...overrides }),
  })
}

describe('Community: public notices feed', () => {
  it('lists notices without auth', async () => {
    const res = await fetch(`${BASE}/api/community/notices`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data.notices)).toBe(true)
  })
})

describe('Community: quota', () => {
  it('requires auth', async () => {
    const res = await fetch(`${BASE}/api/community/notices/quota`)
    expect(res.status).toBe(401)
  })

  it('returns the quota for an authenticated user', async () => {
    const { accessToken } = await registerAndLogin('comm-quota')
    const res = await fetch(`${BASE}/api/community/notices/quota`, { headers: authHeaders(accessToken) })
    expect(res.status).toBe(200)
    const { data } = await res.json()
    expect(data.dailyMax).toBe(1)
    expect(data.weeklyMax).toBe(3)
    expect(data.usedToday).toBe(0)
    expect(data.canPost).toBe(true)
  })
})

describe('Community: create notice', () => {
  it('requires auth', async () => {
    const res = await fetch(`${BASE}/api/community/notices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'green', lat: 45.07, lng: 7.68, photoKey: photoKey() }),
    })
    expect(res.status).toBe(401)
  })

  it('creates a notice for an authenticated user', async () => {
    const { accessToken } = await registerAndLogin('comm-create')
    const res = await createNotice(accessToken)
    expect(res.status).toBe(201)
    const { data } = await res.json()
    expect(data.notice.id).toBeTruthy()
    expect(data.notice.status).toBe('open')
    expect(data.notice.category).toBe('green')
    expect(data.notice.isOwn).toBe(true)
  })

  it('rejects an invalid category', async () => {
    const { accessToken } = await registerAndLogin('comm-badcat')
    const res = await createNotice(accessToken, { category: 'not-a-category' })
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('VALIDATION_ERROR')
  })

  it('requires a photoKey', async () => {
    const { accessToken } = await registerAndLogin('comm-nophoto')
    const res = await fetch(`${BASE}/api/community/notices`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ category: 'green', lat: 45.07, lng: 7.68 }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('VALIDATION_ERROR')
  })

  it('rejects a photoKey outside the community/ prefix', async () => {
    const { accessToken } = await registerAndLogin('comm-badkey')
    const res = await createNotice(accessToken, { photoKey: 'avatars/evil.jpg' })
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('BAD_REQUEST')
  })

  it('requires a note for the "other" category', async () => {
    const { accessToken } = await registerAndLogin('comm-note')
    const res = await createNotice(accessToken, { category: 'other' })
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('VALIDATION_ERROR')
  })

  it('enforces the daily limit (1/day)', async () => {
    const { accessToken } = await registerAndLogin('comm-limit')
    const first = await createNotice(accessToken)
    expect(first.status).toBe(201)
    const second = await createNotice(accessToken)
    expect(second.status).toBe(429)
    expect((await second.json()).code).toBe('RATE_LIMIT_DAILY')
  })
})

describe('Community: mark fixed', () => {
  it('requires auth', async () => {
    const res = await fetch(`${BASE}/api/community/notices/whatever`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beforePhotoKey: photoKey(), afterPhotoKey: photoKey() }),
    })
    expect(res.status).toBe(401)
  })

  it('lets a volunteer mark a notice fixed, then rejects re-fixing', async () => {
    const owner = await registerAndLogin('comm-fix-owner')
    const created = await (await createNotice(owner.accessToken)).json()
    const noticeId = created.data.notice.id

    const volunteer = await registerAndLogin('comm-fix-vol')
    const fix = await fetch(`${BASE}/api/community/notices/${noticeId}`, {
      method: 'PATCH',
      headers: authHeaders(volunteer.accessToken),
      body: JSON.stringify({ beforePhotoKey: photoKey(), afterPhotoKey: photoKey() }),
    })
    expect(fix.status).toBe(200)
    const fixed = await fix.json()
    expect(fixed.data.notice.status).toBe('fixed')
    expect(fixed.data.notice.fixedAt).not.toBeNull()

    // Re-fixing an already-fixed notice is rejected.
    const again = await fetch(`${BASE}/api/community/notices/${noticeId}`, {
      method: 'PATCH',
      headers: authHeaders(volunteer.accessToken),
      body: JSON.stringify({ beforePhotoKey: photoKey(), afterPhotoKey: photoKey() }),
    })
    expect(again.status).toBe(400)
    expect((await again.json()).code).toBe('ALREADY_FIXED')
  })

  it('returns 404 for an unknown notice', async () => {
    const { accessToken } = await registerAndLogin('comm-fix-404')
    const res = await fetch(`${BASE}/api/community/notices/does-not-exist`, {
      method: 'PATCH',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ beforePhotoKey: photoKey(), afterPhotoKey: photoKey() }),
    })
    expect(res.status).toBe(404)
  })

  it('validates the before/after photo keys', async () => {
    const owner = await registerAndLogin('comm-fix-badkey')
    const created = await (await createNotice(owner.accessToken)).json()
    const res = await fetch(`${BASE}/api/community/notices/${created.data.notice.id}`, {
      method: 'PATCH',
      headers: authHeaders(owner.accessToken),
      body: JSON.stringify({ beforePhotoKey: 'avatars/x.jpg', afterPhotoKey: 'avatars/y.jpg' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('Community: delete notice', () => {
  it('requires auth', async () => {
    const res = await fetch(`${BASE}/api/community/notices/whatever`, { method: 'DELETE' })
    expect(res.status).toBe(401)
  })

  it('lets the owner delete their own notice', async () => {
    const owner = await registerAndLogin('comm-del-owner')
    const created = await (await createNotice(owner.accessToken)).json()
    const res = await fetch(`${BASE}/api/community/notices/${created.data.notice.id}`, {
      method: 'DELETE',
      headers: authHeaders(owner.accessToken),
    })
    expect(res.status).toBe(200)
    expect((await res.json()).data.deleted).toBe(true)
  })

  it('forbids a non-owner (non-admin) from deleting', async () => {
    const owner = await registerAndLogin('comm-del-victim')
    const created = await (await createNotice(owner.accessToken)).json()
    const other = await registerAndLogin('comm-del-attacker')
    const res = await fetch(`${BASE}/api/community/notices/${created.data.notice.id}`, {
      method: 'DELETE',
      headers: authHeaders(other.accessToken),
    })
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('PERMISSION_DENIED')
  })

  it('lets an admin delete any notice', async () => {
    const owner = await registerAndLogin('comm-del-byadmin')
    const created = await (await createNotice(owner.accessToken)).json()
    const adminToken = await loginAsAdmin()
    const res = await fetch(`${BASE}/api/community/notices/${created.data.notice.id}`, {
      method: 'DELETE',
      headers: authHeaders(adminToken),
    })
    expect(res.status).toBe(200)
  })

  it('returns 404 for an unknown notice', async () => {
    const { accessToken } = await registerAndLogin('comm-del-404')
    const res = await fetch(`${BASE}/api/community/notices/does-not-exist`, {
      method: 'DELETE',
      headers: authHeaders(accessToken),
    })
    expect(res.status).toBe(404)
  })
})
