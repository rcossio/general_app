import { describe, it, expect } from 'vitest'
import { BASE, registerAndLogin, authHeaders } from '../helpers'

const ENTRY_PAYLOAD = { type: 'GOAL', title: 'Test goal', score: 7 }

async function createEntry(accessToken: string) {
  const res = await fetch(`${BASE}/api/tracker/entries`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(ENTRY_PAYLOAD),
  })
  const body = await res.json()
  return { res, id: body.data?.id as string }
}

describe('Tracker: Public Feed', () => {
  it('public endpoint requires no auth and returns only public entries', async () => {
    const { accessToken } = await registerAndLogin('tracker-pub-setup')

    // Create a private and a public entry
    const privRes = await fetch(`${BASE}/api/tracker/entries`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ type: 'GOAL', title: 'Private goal', score: 5, isPublic: false }),
    })
    const privBody = await privRes.json()
    const privId = privBody.data?.id as string

    const pubRes = await fetch(`${BASE}/api/tracker/entries`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ type: 'ACHIEVEMENT', title: 'Public achievement', score: 8, isPublic: true }),
    })
    const pubBody = await pubRes.json()
    const pubId = pubBody.data?.id as string

    // Hit public endpoint with no auth
    const feedRes = await fetch(`${BASE}/api/tracker/entries/public`)
    expect(feedRes.status).toBe(200)
    const feedBody = await feedRes.json()
    const titles = feedBody.data.entries.map((e: { title: string }) => e.title)
    expect(titles).toContain('Public achievement')
    expect(titles).not.toContain('Private goal')

    // Each entry includes author name
    const pub = feedBody.data.entries.find((e: { title: string }) => e.title === 'Public achievement')
    expect(pub.user).toHaveProperty('name')

    await fetch(`${BASE}/api/tracker/entries/${privId}`, { method: 'DELETE', headers: authHeaders(accessToken) })
    await fetch(`${BASE}/api/tracker/entries/${pubId}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })

  it('public feed can be filtered by type', async () => {
    const { accessToken } = await registerAndLogin('tracker-pub-filter')

    const goalRes = await fetch(`${BASE}/api/tracker/entries`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ type: 'GOAL', title: 'Public GOAL', score: 6, isPublic: true }),
    })
    const goalBody = await goalRes.json()
    const goalId = goalBody.data?.id as string

    const emoRes = await fetch(`${BASE}/api/tracker/entries`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ type: 'EMOTION', title: 'Public EMOTION', score: 4, isPublic: true }),
    })
    const emoBody = await emoRes.json()
    const emoId = emoBody.data?.id as string

    const filtered = await fetch(`${BASE}/api/tracker/entries/public?type=GOAL`)
    const filteredBody = await filtered.json()
    const titles = filteredBody.data.entries.map((e: { title: string }) => e.title)
    expect(titles).toContain('Public GOAL')
    expect(titles).not.toContain('Public EMOTION')

    await fetch(`${BASE}/api/tracker/entries/${goalId}`, { method: 'DELETE', headers: authHeaders(accessToken) })
    await fetch(`${BASE}/api/tracker/entries/${emoId}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })

  it('updating isPublic via PUT changes feed visibility', async () => {
    const { accessToken } = await registerAndLogin('tracker-pub-toggle')
    const { id } = await createEntry(accessToken)

    const before = await fetch(`${BASE}/api/tracker/entries/public`)
    const beforeBody = await before.json()
    const titlesBefore = beforeBody.data.entries.map((e: { title: string }) => e.title)
    expect(titlesBefore).not.toContain('Test goal')

    await fetch(`${BASE}/api/tracker/entries/${id}`, {
      method: 'PUT',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ isPublic: true }),
    })

    const after = await fetch(`${BASE}/api/tracker/entries/public`)
    const afterBody = await after.json()
    const titlesAfter = afterBody.data.entries.map((e: { title: string }) => e.title)
    expect(titlesAfter).toContain('Test goal')

    await fetch(`${BASE}/api/tracker/entries/${id}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })
})

describe('Tracker: List & Stats', () => {
  it('returns paginated entries for the user', async () => {
    const { accessToken } = await registerAndLogin('tracker-list')
    const res = await fetch(`${BASE}/api/tracker/entries`, { headers: authHeaders(accessToken) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveProperty('entries')
    expect(body.data).toHaveProperty('total')
  })

  it('returns stats for the user', async () => {
    const { accessToken } = await registerAndLogin('tracker-stats')
    const res = await fetch(`${BASE}/api/tracker/stats`, { headers: authHeaders(accessToken) })
    expect(res.status).toBe(200)
  })
})

describe('Tracker: CRUD', () => {
  it('creates an entry and returns it', async () => {
    const { accessToken } = await registerAndLogin('tracker-create')
    const { res, id } = await createEntry(accessToken)
    expect(res.status).toBe(201)
    expect(id).toBeTruthy()
    // cleanup
    await fetch(`${BASE}/api/tracker/entries/${id}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })

  it('returns 400 when required fields are missing', async () => {
    const { accessToken } = await registerAndLogin('tracker-bad')
    const res = await fetch(`${BASE}/api/tracker/entries`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ title: 'Missing type and score' }),
    })
    expect(res.status).toBe(400)
  })

  it('reads a single entry', async () => {
    const { accessToken } = await registerAndLogin('tracker-read')
    const { id } = await createEntry(accessToken)
    const res = await fetch(`${BASE}/api/tracker/entries/${id}`, { headers: authHeaders(accessToken) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.id).toBe(id)
    // cleanup
    await fetch(`${BASE}/api/tracker/entries/${id}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })

  it('updates an entry', async () => {
    const { accessToken } = await registerAndLogin('tracker-update')
    const { id } = await createEntry(accessToken)
    const res = await fetch(`${BASE}/api/tracker/entries/${id}`, {
      method: 'PUT',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ score: 9 }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.score).toBe(9)
    // cleanup
    await fetch(`${BASE}/api/tracker/entries/${id}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })

  it('deletes an entry', async () => {
    const { accessToken } = await registerAndLogin('tracker-delete')
    const { id } = await createEntry(accessToken)
    const res = await fetch(`${BASE}/api/tracker/entries/${id}`, {
      method: 'DELETE',
      headers: authHeaders(accessToken),
    })
    expect(res.status).toBe(200)
  })

  it('cannot read another user\'s entry (404)', async () => {
    const user1 = await registerAndLogin('tracker-owner')
    const user2 = await registerAndLogin('tracker-other')
    const { id } = await createEntry(user1.accessToken)
    const res = await fetch(`${BASE}/api/tracker/entries/${id}`, { headers: authHeaders(user2.accessToken) })
    expect(res.status).toBe(404)
    // cleanup
    await fetch(`${BASE}/api/tracker/entries/${id}`, { method: 'DELETE', headers: authHeaders(user1.accessToken) })
  })
})
