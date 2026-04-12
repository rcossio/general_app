export type Condition = null | string | { and: Condition[] } | { or: Condition[] } | { not: Condition }

const MAX_DEPTH = 10

export function evaluate(condition: Condition, flags: Set<string>, depth = 0): boolean {
  if (depth > MAX_DEPTH) return false
  if (condition === null) return true
  if (typeof condition === 'string') return flags.has(condition)
  if (typeof condition === 'object' && 'and' in condition) {
    return condition.and.every((c) => evaluate(c, flags, depth + 1))
  }
  if (typeof condition === 'object' && 'or' in condition) {
    return condition.or.some((c) => evaluate(c, flags, depth + 1))
  }
  if (typeof condition === 'object' && 'not' in condition) {
    return !evaluate(condition.not, flags, depth + 1)
  }
  return false
}
