import { describe, it, expect, beforeAll } from 'vitest'
import { BASE, registerAndLogin, authHeaders } from './helpers'

// -------------------------------------------------------------------------
// These tests require the chapter-1 game to be imported AND active.
// Run before testing:
//   npx tsx scripts/import-game.ts --file=scripts/chapter1.json \
//     --slug=chapter-1 --title="Chapter 1" --chapter=1 --activate
// -------------------------------------------------------------------------

let gameId: string
let sessionId: string

// Coordinates of loc_1_start (Notice Board) — within any radius
const LOC_1_LAT = 45.01513449199466
const LOC_1_LNG = 8.62788452481497

// Coordinates of loc_5_gate (Locked Gate)
const LOC_5_LAT = 45.01480624368455
const LOC_5_LNG = 8.627613672090963

describe('Adventure: Games list', () => {
  it('requires auth', async () => {
    const res = await fetch(`${BASE}/api/adventure/games`)
    expect(res.status).toBe(401)
  })

  it('returns active games for authenticated user', async () => {
    const { accessToken } = await registerAndLogin('adv-games')
    const res = await fetch(`${BASE}/api/adventure/games`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('chapter-1 game is present and active', async () => {
    const { accessToken } = await registerAndLogin('adv-games-ch1')
    const res = await fetch(`${BASE}/api/adventure/games`, {
      headers: authHeaders(accessToken),
    })
    const body = await res.json()
    const chapter1 = body.data.find((g: { slug: string }) => g.slug === 'chapter-1')
    expect(chapter1).toBeDefined()
    gameId = chapter1.id
  })
})

describe('Adventure: Session lifecycle', () => {
  let accessToken: string

  beforeAll(async () => {
    const auth = await registerAndLogin('adv-session')
    accessToken = auth.accessToken

    // Ensure gameId is resolved (depends on previous describe block running first)
    if (!gameId) {
      const res = await fetch(`${BASE}/api/adventure/games`, {
        headers: authHeaders(accessToken),
      })
      const body = await res.json()
      const ch1 = body.data.find((g: { slug: string }) => g.slug === 'chapter-1')
      gameId = ch1?.id
    }
  })

  it('returns 400 when gameId is missing', async () => {
    const res = await fetch(`${BASE}/api/adventure/sessions`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('returns 404 for unknown gameId', async () => {
    const res = await fetch(`${BASE}/api/adventure/sessions`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ gameId: 'does-not-exist' }),
    })
    expect(res.status).toBe(404)
  })

  it('creates a new session', async () => {
    expect(gameId).toBeTruthy()
    const res = await fetch(`${BASE}/api/adventure/sessions`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ gameId }),
    })
    expect([200, 201]).toContain(res.status)
    const body = await res.json()
    expect(body.data.sessionId).toBeTruthy()
    sessionId = body.data.sessionId
  })

  it('returns same session on repeated start (idempotent)', async () => {
    const res = await fetch(`${BASE}/api/adventure/sessions`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ gameId }),
    })
    const body = await res.json()
    expect(body.data.sessionId).toBe(sessionId)
  })

  it('GET session returns correct initial state', async () => {
    const res = await fetch(`${BASE}/api/adventure/sessions/${sessionId}`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const data = body.data
    expect(data.session.id).toBe(sessionId)
    expect(data.session.completedAt).toBeNull()
    expect(data.session.flags).toEqual([])
    expect(data.session.visitedLocationIds).toEqual([])
    // Only the start location should be visible (visibleWhen: null)
    const visible = data.locations.filter((l: { visible: boolean }) => l.visible)
    expect(visible.length).toBe(1)
    expect(visible[0].name).toBe('Notice Board')
    expect(data.game.slug).toBe('chapter-1')
  })

  it('returns 404 for another user trying to access session', async () => {
    const other = await registerAndLogin('adv-other')
    const res = await fetch(`${BASE}/api/adventure/sessions/${sessionId}`, {
      headers: authHeaders(other.accessToken),
    })
    expect(res.status).toBe(404)
  })
})

describe('Adventure: Visit flow', () => {
  let accessToken: string
  let locNoticeBoard: string
  let locGate: string
  let locFriend: string
  let locShed: string

  beforeAll(async () => {
    const auth = await registerAndLogin('adv-visit')
    accessToken = auth.accessToken

    // Resolve gameId if needed
    if (!gameId) {
      const res = await fetch(`${BASE}/api/adventure/games`, {
        headers: authHeaders(accessToken),
      })
      const body = await res.json()
      const ch1 = body.data.find((g: { slug: string }) => g.slug === 'chapter-1')
      gameId = ch1?.id
    }

    // Start fresh session
    const sRes = await fetch(`${BASE}/api/adventure/sessions`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ gameId }),
    })
    const sBody = await sRes.json()
    sessionId = sBody.data.sessionId

    // Resolve location ids
    const stateRes = await fetch(`${BASE}/api/adventure/sessions/${sessionId}`, {
      headers: authHeaders(accessToken),
    })
    const stateBody = await stateRes.json()
    const locations = stateBody.data.locations as Array<{ id: string; externalId: string }>
    locNoticeBoard = locations.find((l) => l.externalId === 'loc_1_start')!.id
    locGate = locations.find((l) => l.externalId === 'loc_5_gate')!.id
    locFriend = locations.find((l) => l.externalId === 'loc_2_friend')!.id
    locShed = locations.find((l) => l.externalId === 'loc_3_key')!.id
  })

  it('returns 400 when location is too far', async () => {
    const res = await fetch(`${BASE}/api/adventure/sessions/${sessionId}/visit`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        locationId: locNoticeBoard,
        lat: 0,    // middle of the ocean — definitely too far
        lng: 0,
      }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('TOO_FAR')
  })

  it('returns 403 for a hidden location', async () => {
    // Gate requires visited_start — not set yet
    const res = await fetch(`${BASE}/api/adventure/sessions/${sessionId}/visit`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        locationId: locGate,
        lat: LOC_5_LAT,
        lng: LOC_5_LNG,
      }),
    })
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('NOT_ACCESSIBLE')
  })

  it('visits Notice Board and grants visited_start flag', async () => {
    const res = await fetch(`${BASE}/api/adventure/sessions/${sessionId}/visit`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        locationId: locNoticeBoard,
        lat: LOC_1_LAT,
        lng: LOC_1_LNG,
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.newFlags).toContain('visited_start')
    expect(body.data.completesChapter).toBe(false)
    expect(body.data.alreadyVisited).toBe(false)
  })

  it('revisiting Notice Board shows updated narrative, no new flags', async () => {
    const res = await fetch(`${BASE}/api/adventure/sessions/${sessionId}/visit`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        locationId: locNoticeBoard,
        lat: LOC_1_LAT,
        lng: LOC_1_LNG,
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.alreadyVisited).toBe(true)
    expect(body.data.newFlags).toEqual([])
    expect(body.data.narrative).toContain('already read the board')
  })

  it('after visiting Notice Board, more locations become visible', async () => {
    const res = await fetch(`${BASE}/api/adventure/sessions/${sessionId}`, {
      headers: authHeaders(accessToken),
    })
    const body = await res.json()
    const visible = body.data.locations.filter((l: { visible: boolean }) => l.visible)
    expect(visible.length).toBeGreaterThan(1)
    // Gate, Friend's House, Shed, Toolbox should now be visible
    const names = visible.map((l: { name: string }) => l.name)
    expect(names).toContain("Friend's House")
    expect(names).toContain('Old Shed')
    expect(names).toContain('Locked Gate')
  })

  it('visiting Friend House grants has_friend', async () => {
    const res = await fetch(`${BASE}/api/adventure/sessions/${sessionId}/visit`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        locationId: locFriend,
        lat: 45.014987959911174,
        lng: 8.628290416329916,
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.newFlags).toContain('has_friend')
  })

  it('visiting Shed grants has_key', async () => {
    const res = await fetch(`${BASE}/api/adventure/sessions/${sessionId}/visit`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        locationId: locShed,
        lat: 45.0153837176548,
        lng: 8.628024375589824,
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.newFlags).toContain('has_key')
  })

  it('visiting Gate with has_friend + has_key completes the chapter', async () => {
    const res = await fetch(`${BASE}/api/adventure/sessions/${sessionId}/visit`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        locationId: locGate,
        lat: LOC_5_LAT,
        lng: LOC_5_LNG,
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.completesChapter).toBe(true)
    expect(body.data.narrative).toContain('force open the gate')
  })

  it('session is marked completed after chapter win', async () => {
    const res = await fetch(`${BASE}/api/adventure/sessions/${sessionId}`, {
      headers: authHeaders(accessToken),
    })
    const body = await res.json()
    expect(body.data.session.completedAt).not.toBeNull()
  })

  it('cannot visit locations after session is completed', async () => {
    const res = await fetch(`${BASE}/api/adventure/sessions/${sessionId}/visit`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        locationId: locNoticeBoard,
        lat: LOC_1_LAT,
        lng: LOC_1_LNG,
      }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('SESSION_COMPLETE')
  })
})

describe('Adventure: Condition evaluator', () => {
  it('evaluates simple flag correctly', async () => {
    const { evaluate } = await import('../modules/adventure/lib/condition')
    const flags = new Set(['has_friend', 'visited_start'])
    expect(evaluate('has_friend', flags)).toBe(true)
    expect(evaluate('has_key', flags)).toBe(false)
    expect(evaluate(null, flags)).toBe(true)
  })

  it('evaluates AND condition', async () => {
    const { evaluate } = await import('../modules/adventure/lib/condition')
    const flags = new Set(['has_friend', 'visited_start'])
    expect(evaluate({ and: ['has_friend', 'visited_start'] }, flags)).toBe(true)
    expect(evaluate({ and: ['has_friend', 'has_key'] }, flags)).toBe(false)
  })

  it('evaluates OR condition', async () => {
    const { evaluate } = await import('../modules/adventure/lib/condition')
    const flags = new Set(['has_friend'])
    expect(evaluate({ or: ['has_friend', 'has_key'] }, flags)).toBe(true)
    expect(evaluate({ or: ['has_key', 'has_hammer'] }, flags)).toBe(false)
  })

  it('evaluates nested AND/OR (gate condition)', async () => {
    const { evaluate } = await import('../modules/adventure/lib/condition')
    const gateCondition = { and: ['has_friend', { or: ['has_key', 'has_hammer'] }] }

    expect(evaluate(gateCondition as Parameters<typeof evaluate>[0], new Set(['has_friend', 'has_key']))).toBe(true)
    expect(evaluate(gateCondition as Parameters<typeof evaluate>[0], new Set(['has_friend', 'has_hammer']))).toBe(true)
    expect(evaluate(gateCondition as Parameters<typeof evaluate>[0], new Set(['has_friend']))).toBe(false)
    expect(evaluate(gateCondition as Parameters<typeof evaluate>[0], new Set(['has_key']))).toBe(false)
    expect(evaluate(gateCondition as Parameters<typeof evaluate>[0], new Set())).toBe(false)
  })
})

describe('Adventure: Haversine', () => {
  it('distance between same point is 0', async () => {
    const { distanceMeters } = await import('../modules/adventure/lib/haversine')
    expect(distanceMeters(45.0, 8.6, 45.0, 8.6)).toBe(0)
  })

  it('distance between Notice Board and Gate is within expected range', async () => {
    const { distanceMeters } = await import('../modules/adventure/lib/haversine')
    const dist = distanceMeters(LOC_1_LAT, LOC_1_LNG, LOC_5_LAT, LOC_5_LNG)
    // They are roughly 40–200m apart based on coordinates
    expect(dist).toBeGreaterThan(20)
    expect(dist).toBeLessThan(500)
  })
})
