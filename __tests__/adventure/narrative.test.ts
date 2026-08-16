import { describe, it, expect } from 'vitest'
import {
  resolveActiveValue,
  resolveValueIndex,
  resolveNarrative,
  type LocationValue,
} from '../../modules/adventure/lib/narrative'

// A gate: when the player holds `has_key` it's unlocked (and ends the chapter);
// otherwise it shows a locked state behind a password. Values are ordered —
// the first whose `when` matches wins.
const gate: LocationValue[] = [
  { when: 'has_key', content: { en: 'unlocked' }, completesChapter: true, imageUrl: 'art/open.webp' },
  { when: null, content: { en: 'locked' }, password: { value: '1234', grants: [{ flag: 'has_key' }] } },
]

describe('resolveActiveValue', () => {
  it('returns the first value whose condition matches (order wins)', () => {
    expect(resolveActiveValue(gate, new Set(['has_key']))?.content.en).toBe('unlocked')
    // null `when` always matches → falls through to the locked value
    expect(resolveActiveValue(gate, new Set())?.content.en).toBe('locked')
  })

  it('returns null when nothing matches', () => {
    const v: LocationValue[] = [{ when: 'never', content: { en: 'x' } }]
    expect(resolveActiveValue(v, new Set())).toBeNull()
  })

  it('honours AND/OR conditions via the evaluator', () => {
    const v: LocationValue[] = [
      { when: { and: ['a', { or: ['b', 'c'] }] }, content: { en: 'hit' } },
      { when: null, content: { en: 'fallback' } },
    ]
    expect(resolveActiveValue(v, new Set(['a', 'c']))?.content.en).toBe('hit')
    expect(resolveActiveValue(v, new Set(['a']))?.content.en).toBe('fallback')
  })
})

describe('resolveValueIndex', () => {
  it('returns the index of the first matching value', () => {
    expect(resolveValueIndex(gate, new Set(['has_key']))).toBe(0)
    expect(resolveValueIndex(gate, new Set())).toBe(1)
  })

  it('returns -1 when nothing matches', () => {
    expect(resolveValueIndex([{ when: 'never', content: {} }], new Set())).toBe(-1)
  })
})

describe('resolveNarrative', () => {
  it('exposes the resolved value to the client (content, completion, image)', () => {
    const open = resolveNarrative(gate, new Set(['has_key']))
    expect(open.content.en).toBe('unlocked')
    expect(open.completesChapter).toBe(true)
    expect(open.imageUrl).toBe('art/open.webp')
    expect(open.hasPassword).toBe(false)
    expect(open.choices).toBeNull()
  })

  it('flags a password value and defaults completesChapter/imageUrl', () => {
    const locked = resolveNarrative(gate, new Set())
    expect(locked.content.en).toBe('locked')
    expect(locked.hasPassword).toBe(true)
    expect(locked.completesChapter).toBe(false)
    expect(locked.imageUrl).toBeNull()
  })

  it('maps choices to {id,label} only (strips outcome/grants)', () => {
    const v: LocationValue[] = [
      {
        when: null,
        content: { en: 'pick' },
        choices: [
          { id: 'a', label: { en: 'A' }, outcome: { en: 'oa' }, grants: [{ flag: 'fa' }] },
          { id: 'b', label: { en: 'B' }, outcome: { en: 'ob' }, grants: [] },
        ],
      },
    ]
    expect(resolveNarrative(v, new Set()).choices).toEqual([
      { id: 'a', label: { en: 'A' } },
      { id: 'b', label: { en: 'B' } },
    ])
  })

  it('returns an empty resolved view when nothing matches', () => {
    expect(resolveNarrative([{ when: 'never', content: { en: 'x' } }], new Set())).toEqual({
      content: {},
      completesChapter: false,
      choices: null,
      hasPassword: false,
      imageUrl: null,
    })
  })
})
