import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import type { Extensions } from '@tiptap/core'

// The constrained Tiptap extension set shared by every rich-text surface
// (Memorial posts, Events, …), used by BOTH the client editor (useEditor) and
// the server-side generateHTML() on public pages. Keeping it in one place means
// what the author can type is exactly what gets rendered. The limited node/mark
// set (no script/embed nodes) plus the link protocol allowlist below mean stored
// content cannot inject scripts, so public pages can render it safely.
export function richTextExtensions(): Extensions {
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

// An empty Tiptap document — the starting content for a new post/event.
export const EMPTY_DOC = { type: 'doc', content: [] } as const
