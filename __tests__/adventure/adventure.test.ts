import { describe, it, expect } from 'vitest'

// -------------------------------------------------------------------------
// Pure unit tests for the Adventure engine — no live server / game content
// required. The integration suite (session lifecycle, GPS visit flow) was
// removed because it was pinned to a chapter that no longer exists; if it
// returns it should be content-agnostic (derive the start location from
// `visibleWhen: null` and walk the graph by flags rather than hardcoding ids).
// -------------------------------------------------------------------------

describe('Adventure: Condition evaluator', () => {
  it('evaluates simple flag correctly', async () => {
    const { evaluate } = await import('../../modules/adventure/lib/condition')
    const flags = new Set(['has_friend', 'visited_start'])
    expect(evaluate('has_friend', flags)).toBe(true)
    expect(evaluate('has_key', flags)).toBe(false)
    expect(evaluate(null, flags)).toBe(true)
  })

  it('evaluates AND condition', async () => {
    const { evaluate } = await import('../../modules/adventure/lib/condition')
    const flags = new Set(['has_friend', 'visited_start'])
    expect(evaluate({ and: ['has_friend', 'visited_start'] }, flags)).toBe(true)
    expect(evaluate({ and: ['has_friend', 'has_key'] }, flags)).toBe(false)
  })

  it('evaluates OR condition', async () => {
    const { evaluate } = await import('../../modules/adventure/lib/condition')
    const flags = new Set(['has_friend'])
    expect(evaluate({ or: ['has_friend', 'has_key'] }, flags)).toBe(true)
    expect(evaluate({ or: ['has_key', 'has_hammer'] }, flags)).toBe(false)
  })

  it('evaluates nested AND/OR (gate condition)', async () => {
    const { evaluate } = await import('../../modules/adventure/lib/condition')
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
    const { distanceMeters } = await import('../../modules/adventure/lib/haversine')
    expect(distanceMeters(45.0, 8.6, 45.0, 8.6)).toBe(0)
  })

  it('distance between two nearby points is within expected range', async () => {
    const { distanceMeters } = await import('../../modules/adventure/lib/haversine')
    const dist = distanceMeters(45.01582683234417, 8.628133553657252, 45.014486301008176, 8.62806747813587)
    // Roughly 40–200m apart based on coordinates
    expect(dist).toBeGreaterThan(20)
    expect(dist).toBeLessThan(500)
  })
})
