import { describe, it, expect, beforeAll } from 'vitest'
import { BASE, registerAndLogin, authHeaders } from '../helpers'

// Content-agnostic integration tests for the Adventure visit CHOICE and PASSWORD
// mechanics (app/api/adventure/sessions/[id]/visit/route.ts).
//
// A fresh session only exposes the start location, which has no choices/password.
// So beforeAll plays the chapter forward — visit+close every reachable location —
// until a location that reports `choices` and/or `hasPassword` becomes visible.
// Everything is still derived from the session GET response, so the tests survive
// chapter-content changes and skip gracefully when no such content exists.

type ApiChoice = { id: string; label: Record<string, string> }

type ApiLocation = {
  id: string
  lat: number
  lng: number
  radiusM: number
  visible: boolean
  status: 'open' | 'closed' | null
  choices: ApiChoice[] | null
  hasPassword: boolean
}

describe('Adventure visit mechanics (choices + password)', () => {
  let token: string
  let sessionId: string
  let choiceLoc: ApiLocation | undefined
  let passwordLoc: ApiLocation | undefined

  const getLocations = async (): Promise<ApiLocation[]> => {
    const res = await fetch(`${BASE}/api/adventure/sessions/${sessionId}`, { headers: authHeaders(token) })
    return (await res.json()).data.locations as ApiLocation[]
  }

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

  beforeAll(async () => {
    token = (await registerAndLogin('adv-mech')).accessToken

    const games = await (
      await fetch(`${BASE}/api/adventure/games`, { headers: authHeaders(token) })
    ).json()
    const gameId = games.data?.[0]?.id as string

    const created = await (
      await fetch(`${BASE}/api/adventure/sessions`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ gameId }),
      })
    ).json()
    sessionId = created.data.sessionId

    // Play the chapter forward until a choice/password location is exposed, or we
    // run out of progress. Bounded iterations to avoid an infinite loop on a
    // chapter that never terminates.
    for (let iter = 0; iter < 15; iter++) {
      const locations = await getLocations()

      choiceLoc = locations.find((l) => l.visible && Array.isArray(l.choices) && l.choices.length > 0)
      passwordLoc = locations.find((l) => l.visible && l.hasPassword)
      if (choiceLoc && passwordLoc) break

      // Advance: visit+close every visible location that is still open. Closing a
      // location applies its grants, which unlocks gated (previously hidden) ones.
      const open = locations.filter((l) => l.visible && l.status !== 'closed')
      if (open.length === 0) break
      for (const l of open) {
        await visit(l.id, l.lat, l.lng)
        await close(l.id)
      }
    }
  })

  it('setup: session started', () => {
    expect(sessionId).toBeTruthy()
  })

  describe('CHOICE mechanic', () => {
    it('rejects a bogus choiceId with 400 INVALID_CHOICE', async () => {
      if (!choiceLoc) {
        console.log('[mechanics] no location with choices reachable in this chapter — skipping')
        return
      }
      const res = await visit(choiceLoc.id, choiceLoc.lat, choiceLoc.lng, {
        choiceId: 'definitely-not-a-real-choice',
      })
      expect(res.status).toBe(400)
      expect((await res.json()).code).toBe('INVALID_CHOICE')
    })

    it('accepts a valid choiceId (200) and surfaces the choice callback flag in newFlags', async () => {
      if (!choiceLoc || !choiceLoc.choices) {
        console.log('[mechanics] no location with choices reachable in this chapter — skipping')
        return
      }
      const choiceId = choiceLoc.choices[0].id
      const res = await visit(choiceLoc.id, choiceLoc.lat, choiceLoc.lng, { choiceId })
      expect(res.status).toBe(200)
      const body = await res.json()
      // Choices use the callback-flag pattern: each choice grants a temporary
      // callback flag that must surface in newFlags on a first-time selection.
      expect(Array.isArray(body.data.newFlags)).toBe(true)
      expect(body.data.newFlags.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('PASSWORD mechanic', () => {
    it('wrong password returns 200 with passwordWrong:true and empty grants', async () => {
      if (!passwordLoc) {
        console.log('[mechanics] no password-locked location reachable in this chapter — skipping')
        return
      }
      const res = await visit(passwordLoc.id, passwordLoc.lat, passwordLoc.lng, {
        password: 'wrong-password-xyz-000',
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.passwordWrong).toBe(true)
      expect(body.data.newFlags).toEqual([])
      expect(body.data.revokedFlags).toEqual([])
    })

    // The password VALUE is deliberately never exposed by any API (GET reports
    // only `hasPassword: true`). An integration test therefore has no supported
    // way to learn it, so the correct-password branch cannot be exercised here.
    // Documented as a skip rather than asserting on data we cannot obtain.
    it.skip('correct password grants the callback flag (value not exposed by any API)', () => {
      // Intentionally skipped — see comment above.
    })
  })
})
