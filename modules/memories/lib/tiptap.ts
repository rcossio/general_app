import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import type { Extensions } from '@tiptap/core'

// The constrained Tiptap extension set shared by BOTH the client editor
// (useEditor) and the server-side generateHTML() used on the public page.
// Keeping it in one place means what the owner can type is exactly what gets
// rendered. The limited node/mark set (no script/embed nodes) plus the link
// protocol allowlist below means stored content cannot inject scripts, so the
// public page can render it safely.
export function memoryExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2] }, // a single "Title" level for the toolbar
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      protocols: ['http', 'https', 'mailto'],
      HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      // Reject anything that isn't http(s)/mailto — blocks javascript: URLs.
      validate: (href: string) => /^(https?:\/\/|mailto:)/i.test(href),
    }),
  ]
}

// An empty Tiptap document — the starting content for a new post.
export const EMPTY_DOC = { type: 'doc', content: [] } as const
