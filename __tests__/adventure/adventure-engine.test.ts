import { describe, it, expect, beforeAll } from 'vitest'
import { BASE, registerAndLogin, authHeaders } from '../helpers'

// Content-agnostic integration tests for the Adventure engine. They derive
// everything (coordinates, which locations are visible) from the session GET
// response, so they survive chapter-content changes — unlike the old suite that
// hardcoded "Notice Board" / loc_1_start coordinates.

type ApiLocation = {
  id: string
  lat: number
  lng: number
  visible: boolean
  status: 'open' | 'closed' | null
}

describe('Adventure engine', () => {
  let token: string
  let sessionId: string
  let locations: ApiLocation[]

  const getState = async (tok = token, id = sessionId) => {
    const res = await fetch(`${BASE}/api/adventure/sessions/${id}`, { headers: authHeaders(tok) })
    return { res, body: await res.json() }
  }

  beforeAll(async () => {
    token = (await registerAndLogin('adv-engine')).accessToken

    const games = await (await fetch(`${BASE}/api/adventure/games`, { headers: authHeaders(token) })).json()
    const gameId = games.data?.[0]?.id as string

    const created = await (
      await fetch(`${BASE}/api/adventure/sessions`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ gameId }),
      })
    ).json()
    sessionId = created.data.sessionId

    const { body } = await getState()
    locations = body.data.locations as ApiLocation[]
  })

  const visible = () => locations.filter((l) => l.visible)
  const visit = (locationId: string, lat: number, lng: number, extra: Record<string, unknown> = {}) =>
    fetch(`${BASE}/api/adventure/sessions/${sessionId}/visit`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ locationId, lat, lng, ...extra }),
    })
  const close = (locationId: string) =>
    fetch(`${BASE}/api/adventure/sessions/${sessionId}/close`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ locationId }),
    })

  it('GET returns a fresh session with at least one visible start location', () => {
    expect(sessionId).toBeTruthy()
    expect(Array.isArray(locations)).toBe(true)
    expect(visible().length).toBeGreaterThanOrEqual(1)
  })

  it('visit rejects out-of-range coordinates (TOO_FAR)', async () => {
    const start = visible()[0]
    const res = await visit(start.id, 0, 0) // middle of the ocean
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('TOO_FAR')
  })

  it('visit rejects a location whose visibility gate is not met (NOT_ACCESSIBLE)', async () => {
    const hidden = locations.find((l) => !l.visible)
    if (!hidden) {
      console.log('[engine] no gated location in this chapter — skipping NOT_ACCESSIBLE check')
      return
    }
    const res = await visit(hidden.id, hidden.lat, hidden.lng)
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('NOT_ACCESSIBLE')
  })

  it('visit validates the request body', async () => {
    const res = await fetch(`${BASE}/api/adventure/sessions/${sessionId}/visit`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ lat: 1, lng: 1 }), // missing locationId
    })
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('VALIDATION_ERROR')
  })

  it('close rejects a location that was never opened (NOT_OPEN)', async () => {
    const start = visible()[0]
    const res = await close(start.id)
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('NOT_OPEN')
  })

  it('visiting a visible location in range succeeds and is idempotent', async () => {
    const start = visible()[0]
    const first = await visit(start.id, start.lat, start.lng)
    expect(first.status).toBe(200)
    const firstBody = await first.json()
    expect(firstBody.data.alreadyVisited).toBe(false)
    expect(firstBody.data.shouldRefresh).toBe(true)

    const second = await visit(start.id, start.lat, start.lng)
    expect(second.status).toBe(200)
    expect((await second.json()).data.alreadyVisited).toBe(true)
  })

  it('closing an open location applies grants and marks it closed', async () => {
    const start = visible()[0]
    const res = await close(start.id)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.closed).toBe(true)
    expect(Array.isArray(body.data.newFlags)).toBe(true)
    expect(Array.isArray(body.data.revokedFlags)).toBe(true)
    expect(typeof body.data.completesChapter).toBe('boolean')

    const { body: state } = await getState()
    const closed = (state.data.locations as ApiLocation[]).find((l) => l.id === start.id)
    expect(closed?.status).toBe('closed')
  })

  it('another user cannot read or visit the session (404)', async () => {
    const other = await registerAndLogin('adv-engine-other')
    const getRes = await fetch(`${BASE}/api/adventure/sessions/${sessionId}`, {
      headers: authHeaders(other.accessToken),
    })
    expect(getRes.status).toBe(404)

    const start = visible()[0]
    const visitRes = await fetch(`${BASE}/api/adventure/sessions/${sessionId}/visit`, {
      method: 'POST',
      headers: authHeaders(other.accessToken),
      body: JSON.stringify({ locationId: start.id, lat: start.lat, lng: start.lng }),
    })
    expect(visitRes.status).toBe(404)
  })
})
