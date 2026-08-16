// Walk a Tiptap document (or any node) collecting its text — used to show a
// short plain-text preview of rich content. No tiptap import needed; it just
// reads the JSON shape.
export function plainText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as { text?: unknown; content?: unknown[] }
  if (typeof n.text === 'string') return n.text
  if (Array.isArray(n.content)) return n.content.map(plainText).join(' ')
  return ''
}

export function excerpt(node: unknown, max = 140): string {
  const text = plainText(node).replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}
