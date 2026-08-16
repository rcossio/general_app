import { generateHTML } from '@tiptap/html'
import type { JSONContent } from '@tiptap/core'
import { richTextExtensions } from './extensions'

// Render stored Tiptap JSON to HTML on the server (for public pages). Because
// only the constrained richTextExtensions() are used, unknown/unsafe nodes are
// dropped and links are protocol-checked — the output is safe to inject.
// Returns '' on any malformed input rather than throwing.
export function renderRichText(content: unknown): string {
  if (!content || typeof content !== 'object') return ''
  try {
    return generateHTML(content as JSONContent, richTextExtensions())
  } catch {
    return ''
  }
}
