// Game content (title, name, narrative, item fields) is returned by the API as
// raw { locale: string } objects — no language is guaranteed. Resolve to a
// string on the client, falling back to the first available locale when the
// requested one is missing.

export type I18nString = string | Record<string, string>

export function resolveI18n(value: I18nString | null | undefined, locale: string): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale] ?? Object.values(value)[0] ?? ''
}
