'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import type { JSONContent } from '@tiptap/core'
import { Bold, Italic, Heading, Quote, Link as LinkIcon, Unlink } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { memoryExtensions } from '../lib/tiptap'

// The inline WYSIWYG editor for a post's rich text (bold/italic/title/quote/
// links). Emits the current document as Tiptap JSON via onChange.
export function MemoryEditor({
  initialContent,
  onChange,
}: {
  initialContent: JSONContent
  onChange: (json: JSONContent) => void
}) {
  const { t } = useLocale()
  const editor = useEditor({
    extensions: memoryExtensions(),
    content: initialContent,
    immediatelyRender: false, // avoid SSR hydration mismatch under Next
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        class:
          'min-h-[10rem] px-3 py-2 focus:outline-none [&_h2]:font-rubik [&_h2]:text-lg [&_h2]:font-bold [&_h2]:my-2 [&_p]:mb-2 [&_strong]:font-bold [&_em]:italic [&_a]:text-brand-green [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-brand-green [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-brand-gray [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
      },
    },
  })

  if (!editor) return null

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt(t('memories.fmt.linkPrompt'), prev ?? 'https://')
    if (url === null) return
    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  const btn = (active: boolean) =>
    `p-1.5 rounded hover:bg-brand-green-light ${active ? 'bg-brand-green-light text-brand-green' : 'text-brand-gray'}`

  return (
    <div className="rounded-xl border border-brand-border bg-background overflow-hidden">
      <div className="flex items-center gap-0.5 border-b border-brand-border px-1.5 py-1">
        <button type="button" aria-label={t('memories.fmt.bold')} title={t('memories.fmt.bold')} onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))}>
          <Bold className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <button type="button" aria-label={t('memories.fmt.italic')} title={t('memories.fmt.italic')} onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))}>
          <Italic className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <button type="button" aria-label={t('memories.fmt.heading')} title={t('memories.fmt.heading')} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))}>
          <Heading className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <button type="button" aria-label={t('memories.fmt.quote')} title={t('memories.fmt.quote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))}>
          <Quote className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <span className="mx-1 h-5 w-px bg-brand-border" />
        <button type="button" aria-label={t('memories.fmt.link')} title={t('memories.fmt.link')} onClick={setLink} className={btn(editor.isActive('link'))}>
          <LinkIcon className="h-4 w-4" strokeWidth={2.5} />
        </button>
        {editor.isActive('link') && (
          <button type="button" aria-label={t('memories.fmt.unlink')} title={t('memories.fmt.unlink')} onClick={() => editor.chain().focus().unsetLink().run()} className={btn(false)}>
            <Unlink className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
