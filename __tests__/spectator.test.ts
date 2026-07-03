import { describe, it, expect, beforeAll } from 'vitest'
import { BASE, registerAndLogin, authHeaders } from './helpers'

// Content-agnostic integration tests for Adventure spectator multiplayer:
// share (POST/DELETE /api/adventure/sessions/[id]/share) and
// join  (POST /api/adventure/sessions/join).
//
// Everything is created fresh with unique emails so the suite is self-contained.
// If no active game exists we skip gracefully (like adventure-engine.test.ts).

describe('Adventure spectator multiplayer', () => {
  let ownerToken: string
  let sessionId: string
  let hasGame = true

  const share = (id = sessionId, tok = ownerToken) =>
    fetch(`${BASE}/api/adventure/sessions/${id}/share`, { method: 'POST', headers: authHeaders(tok) })
  const unshare = (id = sessionId, tok = ownerToken) =>
    fetch(`${BASE}/api/adventure/sessions/${id}/share`, { method: 'DELETE', headers: authHeaders(tok) })
  const join = (joinCode: string, tok: string) =>
    fetch(`${BASE}/api/adventure/sessions/join`, {
      method: 'POST',
      headers: authHeaders(tok),
      body: JSON.stringify({ joinCode }),
    })
  const getState = (id: string, tok: string) =>
    fetch(`${BASE}/api/adventure/sessions/${id}`, { headers: authHeaders(tok) })

  beforeAll(async () => {
    ownerToken = (await registerAndLogin('spectator-owner')).accessToken

    const games = await (await fetch(`${BASE}/api/adventure/games`, { headers: authHeaders(ownerToken) })).json()
    const gameId = games.data?.[0]?.id as string | undefined
    if (!gameId) {
      hasGame = false
      console.log('[spectator] no active game — skipping spectator tests')
      return
    }

    const created = await (
      await fetch(`${BASE}/api/adventure/sessions`, {
        method: 'POST',
        headers: authHeaders(ownerToken),
        body: JSON.stringify({ gameId }),
      })
    ).json()
    sessionId = created.data.sessionId
  })

  it('owner POST /share returns a 6-char join code; a second POST returns the same code', async () => {
    if (!hasGame) return
    const first = await share()
    // First generation returns 201 Created.
    expect(first.status).toBe(201)
    const firstCode = (await first.json()).data.joinCode as string
    expect(firstCode).toMatch(/^[A-Z0-9]{6}$/)

    // Second call finds the existing code and returns it (200, not 201).
    const second = await share()
    expect(second.status).toBe(200)
    expect((await second.json()).data.joinCode).toBe(firstCode)
  })

  it('a different user can join with the code and is flagged isSpectator on GET', async () => {
    if (!hasGame) return
    const code = (await (await share()).json()).data.joinCode as string

    const spectator = await registerAndLogin('spectator-guest')
    const joinRes = await join(code, spectator.accessToken)
    expect(joinRes.status).toBe(200)
    expect((await joinRes.json()).data.sessionId).toBe(sessionId)

    const stateRes = await getState(sessionId, spectator.accessToken)
    expect(stateRes.status).toBe(200)
    expect((await stateRes.json()).data.isSpectator).toBe(true)

    // Owner reading their own session is NOT a spectator.
    const ownerState = await getState(sessionId, ownerToken)
    expect(ownerState.status).toBe(200)
    expect((await ownerState.json()).data.isSpectator).toBe(false)
  })

  it('joining with an invalid code returns 404', async () => {
    if (!hasGame) return
    const other = await registerAndLogin('spectator-badcode')
    const res = await join('ZZZZZZ', other.accessToken)
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('INVALID_CODE')
  })

  it('a non-owner POST /share on someone else\'s session returns 404', async () => {
    if (!hasGame) return
    const stranger = await registerAndLogin('spectator-stranger')
    const res = await share(sessionId, stranger.accessToken)
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('NOT_FOUND')
  })

  it('a spectator cannot visit or close (security boundary: handlers filter by userId → 404)', async () => {
    if (!hasGame) return
    const code = (await (await share()).json()).data.joinCode as string
    const spectator = await registerAndLogin('spectator-noaction')
    expect((await join(code, spectator.accessToken)).status).toBe(200)

    // Discover a location from the spectator's own view of the session state.
    const state = await (await getState(sessionId, spectator.accessToken)).json()
    const loc = (state.data.locations as Array<{ id: string; lat: number; lng: number }>)[0]

    const visitRes = await fetch(`${BASE}/api/adventure/sessions/${sessionId}/visit`, {
      method: 'POST',
      headers: authHeaders(spectator.accessToken),
      body: JSON.stringify({ locationId: loc.id, lat: loc.lat, lng: loc.lng }),
    })
    // The visit handler scopes the session lookup to userId, so a spectator
    // (who is not the owner) is treated as if the session does not exist → 404.
    // This is the enforced write boundary for spectators.
    expect(visitRes.status).toBe(404)

    const closeRes = await fetch(`${BASE}/api/adventure/sessions/${sessionId}/close`, {
      method: 'POST',
      headers: authHeaders(spectator.accessToken),
      body: JSON.stringify({ locationId: loc.id }),
    })
    expect(closeRes.status).toBe(404)
  })

  it('DELETE /share revokes the code — joining with the old code then returns 404', async () => {
    if (!hasGame) return
    // Ensure a code exists, capture it, then revoke.
    const code = (await (await share()).json()).data.joinCode as string

    const del = await unshare()
    expect(del.status).toBe(200)
    expect((await del.json()).data.revoked).toBe(true)

    const stranger = await registerAndLogin('spectator-afterrevoke')
    const joinRes = await join(code, stranger.accessToken)
    expect(joinRes.status).toBe(404)
    expect((await joinRes.json()).code).toBe('INVALID_CODE')
  })
})
