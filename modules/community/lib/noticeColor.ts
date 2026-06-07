// Notice markers age from yellow (fresh) to red (old/overdue) so stale problems
// visibly demand attention. Color is derived from createdAt on the client — no
// stored state. MAX_AGE_DAYS is the age at which a notice reaches full red.

export const MAX_AGE_DAYS = 30
export const FIXED_WINDOW_DAYS = 14 // fixed (✨) markers linger this long

const FRESH: [number, number, number] = [250, 204, 21] // #facc15 yellow
const OLD: [number, number, number] = [220, 38, 38] // #dc2626 red

// `now` is injectable so the tester time-slider can simulate aging.
export function colorForAge(createdAt: string | Date, now: number = Date.now()): string {
  const ageMs = now - new Date(createdAt).getTime()
  const t = Math.min(Math.max(ageMs / (MAX_AGE_DAYS * 86_400_000), 0), 1)
  const c = FRESH.map((from, i) => Math.round(from + (OLD[i] - from) * t))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}
