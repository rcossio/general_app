import { generateHTML } from '@tiptap/html'
import type { JSONContent } from '@tiptap/core'
import { memoryExtensions } from './tiptap'

// Render stored Tiptap JSON to HTML on the server (for the public profile page).
// Because only the constrained memoryExtensions() are used, unknown/unsafe nodes
// are dropped and links are protocol-checked — the output is safe to inject.
// Returns '' on any malformed input rather than throwing.
export function renderMemoryHtml(content: unknown): string {
  if (!content || typeof content !== 'object') return ''
  try {
    return generateHTML(content as JSONContent, memoryExtensions())
  } catch {
    return ''
  }
}
