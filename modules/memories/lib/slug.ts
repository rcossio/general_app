import { randomBytes } from 'crypto'

// Build a URL-safe slug from the person's name plus a short random suffix so
// public URLs are readable and collisions are effectively impossible. Server-only
// (uses node crypto).
export function makeSlug(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics (combining marks)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  const suffix = randomBytes(4).toString('hex').slice(0, 6)
  return base ? `${base}-${suffix}` : suffix
}
