'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Globe } from 'lucide-react'
import { z } from 'zod'

const TYPES = ['DESIRE', 'EMOTION', 'GOAL', 'ACHIEVEMENT'] as const
type TrackerType = typeof TYPES[number]

export default function EditEntryPage() {
  const params = useParams<{ id: string }>()
  return (
    <ProtectedRoute>
      <EditEntryForm entryId={params.id} />
    </ProtectedRoute>
  )
}

function EditEntryForm({ entryId }: { entryId: string }) {
  const { fetchWithAuth } = useAuth()
  const { t } = useLocale()
  const router = useRouter()
  const [type, setType] = useState<TrackerType>('EMOTION')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [score, setScore] = useState(5)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isPublic, setIsPublic] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const updateSchema = z.object({
    type: z.enum(TYPES),
    title: z.string().min(1, t('tracker.titleRequired')).max(200),
    content: z.string().max(2000).optional(),
    score: z.number().int().min(1).max(10),
    tags: z.array(z.string()).default([]),
    isPublic: z.boolean().default(false),
  })

  useEffect(() => {
    fetchWithAuth(`/api/tracker/entries/${entryId}`)
      .then((r) => r.json())
      .then((body) => {
        const e = body.data
        if (!e) return
        setType(e.type)
        setTitle(e.title)
        setContent(e.content ?? '')
        setScore(e.score)
        setTags(e.tags ?? [])
        setIsPublic(e.isPublic ?? false)
      })
      .finally(() => setLoading(false))
  }, [entryId])

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      setTags((prev) => Array.from(new Set([...prev, tagInput.trim()])))
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => setTags((prev) => prev.filter((tg) => tg !== tag))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = updateSchema.safeParse({ type, title, content: content || undefined, score, tags, isPublic })
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      for (const err of parsed.error.issues) errs[err.path[0] as string] = err.message
      setErrors(errs)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      const res = await fetchWithAuth(`/api/tracker/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      if (res.ok) router.push('/tracker')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="max-w-lg mx-auto p-4 md:p-6 space-y-4">
      {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-brand-border animate-pulse" />)}
    </div>
  )

  return (
    <div className="max-w-lg mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">{t('tracker.editEntry')}</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">{t('tracker.type')}</label>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => setType(tp)}
                className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  type === tp
                    ? 'border-brand-photinia bg-brand-photinia text-white'
                    : 'border-brand-border hover:border-brand-green'
                }`}
              >
                {tp}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('tracker.titleLabel')}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-brand-border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('tracker.score')}: <span className="text-brand-photinia font-bold">{score}</span>/10</label>
          <input
            type="range"
            min={1}
            max={10}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="w-full accent-[var(--green)]"
          />
          <div className="flex justify-between text-xs text-brand-gray mt-1">
            <span>1</span><span>10</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('tracker.notesOptional')}</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-brand-border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('tracker.tags')}</label>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={addTag}
            placeholder={t('tracker.pressEnterToAddTag')}
            className="w-full px-3 py-2 rounded-lg border border-brand-border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-background rounded-full text-xs">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-brand-gray hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="rounded accent-[var(--green)]" />
          <Globe className="h-3.5 w-3.5 text-brand-gray" />
          {t('common.makePublic')}
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-brand-photinia hover:bg-brand-photinia-dark disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {saving ? t('common.saving') : t('tracker.saveChanges')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/tracker')}
            className="px-5 py-2.5 bg-background rounded-lg font-medium text-sm"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
