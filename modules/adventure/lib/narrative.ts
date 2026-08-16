// Pure narrative-resolution engine for the Adventure module. A location holds an
// ordered list of `values`; the first whose `when` condition matches the current
// flag set is the active one. This logic was duplicated across the visit, close,
// and session-GET routes — it lives here so there's one source of truth and it can
// be unit-tested without a DB or a request.

import { evaluate, type Condition } from './condition'

export type GrantEntry = { flag: string }

export type Choice = {
  id: string
  label: Record<string, string>
  outcome: Record<string, string>
  grants: GrantEntry[]
}

export type PasswordData = {
  value: string
  grants: GrantEntry[]
}

export type LocationValue = {
  when: Condition
  content: Record<string, string>
  completesChapter?: boolean
  choices?: Choice[]
  password?: PasswordData
  grants?: GrantEntry[]
  revokes?: GrantEntry[]
  imageUrl?: string | null
}

export type ResolvedNarrative = {
  content: Record<string, string>
  completesChapter: boolean
  choices: { id: string; label: Record<string, string> }[] | null
  hasPassword: boolean
  imageUrl: string | null
}

// The first value whose `when` matches the flags (ordered; first match wins), or null.
export function resolveActiveValue(values: LocationValue[], flags: Set<string>): LocationValue | null {
  for (const v of values) {
    if (evaluate(v.when, flags)) return v
  }
  return null
}

// Index of the first matching value, or -1. Used to detect when a location's
// resolved state changes (so a closed marker can re-brighten).
export function resolveValueIndex(values: LocationValue[], flags: Set<string>): number {
  for (let i = 0; i < values.length; i++) {
    if (evaluate(values[i].when, flags)) return i
  }
  return -1
}

// Client-facing resolved view of a location's current value (no grants/password value).
export function resolveNarrative(values: LocationValue[], flags: Set<string>): ResolvedNarrative {
  for (const v of values) {
    if (evaluate(v.when, flags)) {
      return {
        content: v.content,
        completesChapter: v.completesChapter ?? false,
        choices: v.choices?.map((c) => ({ id: c.id, label: c.label })) ?? null,
        hasPassword: !!v.password,
        imageUrl: v.imageUrl ?? null,
      }
    }
  }
  return { content: {}, completesChapter: false, choices: null, hasPassword: false, imageUrl: null }
}
