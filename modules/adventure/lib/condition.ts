export type Condition = null | string | { and: Condition[] } | { or: Condition[] }

export function evaluate(condition: Condition, flags: Set<string>): boolean {
  if (condition === null) return true
  if (typeof condition === 'string') return flags.has(condition)
  if (typeof condition === 'object' && 'and' in condition) {
    return condition.and.every((c) => evaluate(c, flags))
  }
  if (typeof condition === 'object' && 'or' in condition) {
    return condition.or.some((c) => evaluate(c, flags))
  }
  return false
}
