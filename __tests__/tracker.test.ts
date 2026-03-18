import { describe, it, expect } from 'vitest'
import { BASE, registerAndLogin, authHeaders } from './helpers'

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
