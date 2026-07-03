import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { BASE, registerAndLogin, authHeaders } from './helpers'

// This suite pins the data-ownership boundary of the public notices feed
// (GET /api/community/notices): userId must NEVER leak to clients, `isOwn`
// must be per-viewer, and Cache-Control must differ between the shared
// anonymous response and per-user authed responses.

// A well-formed R2 key matching what the upload-url endpoint mints
// (`community/<uuid>.jpg`). The create endpoint validates this exact shape and
// stores getPublicUrl(key) — it does not touch R2 on create, so a synthetic
// key is enough to create a notice.
const photoKey = () => `community/${randomUUID()}.jpg`

function createNotice(token: string, overrides: Record<string, unknown> = {}) {
  return fetch(`${BASE}/api/community/notices`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ category: 'green', lat: 45.07, lng: 7.68, photoKey: photoKey(), ...overrides }),
  })
}

type Notice = { id: string; isOwn: boolean } & Record<string, unknown>

async function getList(token?: string): Promise<{ res: Response; notices: Notice[] }> {
  const res = await fetch(`${BASE}/api/community/notices`, {
    headers: token ? authHeaders(token) : undefined,
  })
  const body = await res.json()
  return { res, notices: body.data.notices as Notice[] }
}

describe('Community security: notices feed ownership boundary', () => {
  it('never exposes userId and sets a shared cache header on the anonymous feed', async () => {
    // Ensure at least one notice exists so the assertions have something to bite on.
    const owner = await registerAndLogin('comm-sec-anon')
    const created = await createNotice(owner.accessToken)
    // Creation may be blocked by an unexpected rate window if the DB carried
    // state from a prior run for a freshly-minted email; that shouldn't happen
    // with unique emails, so treat non-201 as a hard failure.
    expect(created.status).toBe(201)

    const { res, notices } = await getList()
    expect(res.status).toBe(200)
    expect(Array.isArray(notices)).toBe(true)
    expect(notices.length).toBeGreaterThan(0)

    // No object in the public feed may carry a userId field.
    for (const n of notices) {
      expect(Object.prototype.hasOwnProperty.call(n, 'userId')).toBe(false)
      // Anonymous viewer owns nothing.
      expect(n.isOwn).toBeFalsy()
    }

    // Anonymous response is shared/cacheable.
    expect(res.headers.get('cache-control')).toBe('public, max-age=30, stale-while-revalidate=60')
  })

  it('flags isOwn:true only for the owner and marks the response private', async () => {
    const owner = await registerAndLogin('comm-sec-owner')
    const created = await createNotice(owner.accessToken)
    expect(created.status).toBe(201)
    const noticeId = (await created.json()).data.notice.id as string

    const { res, notices } = await getList(owner.accessToken)
    expect(res.status).toBe(200)

    const mine = notices.find((n) => n.id === noticeId)
    expect(mine, 'owner should see their own notice in the feed').toBeTruthy()
    expect(mine!.isOwn).toBe(true)
    // userId still must not leak even for the owner — only the boolean.
    expect(Object.prototype.hasOwnProperty.call(mine!, 'userId')).toBe(false)

    // Authed responses are per-user and must not be shared by caches.
    expect(res.headers.get('cache-control')).toBe('private, no-store')
  })

  it('does not flag isOwn for a different authenticated user', async () => {
    const owner = await registerAndLogin('comm-sec-victim')
    const created = await createNotice(owner.accessToken)
    expect(created.status).toBe(201)
    const noticeId = (await created.json()).data.notice.id as string

    const other = await registerAndLogin('comm-sec-other')
    const { res, notices } = await getList(other.accessToken)
    expect(res.status).toBe(200)

    const theirs = notices.find((n) => n.id === noticeId)
    expect(theirs, "other user should still see the owner's notice").toBeTruthy()
    expect(theirs!.isOwn).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(theirs!, 'userId')).toBe(false)

    // Still an authed response — private.
    expect(res.headers.get('cache-control')).toBe('private, no-store')
  })

  it('reports whether the R2 upload-url endpoint is configured (informational)', async () => {
    // The task asked us to probe this. Creation does not need R2 (the create
    // endpoint only computes getPublicUrl of a synthetic key), so this is
    // informational only — we assert the auth boundary, not R2 availability.
    const { accessToken } = await registerAndLogin('comm-sec-upload')
    const unauth = await fetch(`${BASE}/api/community/notices/upload-url`, { method: 'POST' })
    expect(unauth.status).toBe(401)

    const authed = await fetch(`${BASE}/api/community/notices/upload-url`, {
      method: 'POST',
      headers: authHeaders(accessToken),
    })
    if (authed.status === 200) {
      const body = await authed.json()
      expect(body.data.key).toMatch(/^community\/[0-9a-f-]+\.jpg$/)
    } else {
      // R2 not configured in this environment — noted, not a failure.
      console.log(`[community-security] upload-url returned ${authed.status} (R2 likely unconfigured)`)
    }
  })
})
