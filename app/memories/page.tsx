'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Flower2, ChevronRight, ExternalLink } from 'lucide-react'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { useLocale } from '@/contexts/LocaleContext'
import { useMemories } from '@/modules/memories/lib/useMemories'

export default function MemoriesPage() {
  return (
    <ProtectedRoute>
      <MyMemorials />
    </ProtectedRoute>
  )
}

function MyMemorials() {
  const { t } = useLocale()
  const router = useRouter()
  const { profiles, loading, create } = useMemories()
  const [name, setName] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('memories.nameRequired'))
      return
    }
    setCreating(true)
    setError(null)
    const slug = await create(name.trim(), subtitle.trim())
    setCreating(false)
    if (slug) router.push(`/memories/${slug}/edit`)
    else setError(t('memories.saveError'))
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-rubik font-bold mb-6 flex items-center gap-2">
        <Flower2 className="h-6 w-6 text-brand-photinia" /> {t('memories.myMemorials')}
      </h1>

      {/* Create */}
      <form onSubmit={submit} className="mb-8 rounded-2xl border border-brand-border bg-surface p-4 space-y-3">
        <p className="font-rubik font-bold text-sm">{t('memories.create')}</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('memories.namePlaceholder')}
          maxLength={120}
          className="w-full rounded-lg border border-brand-border bg-background px-3 py-2 text-sm"
        />
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder={t('memories.subtitlePlaceholder')}
          maxLength={200}
          className="w-full rounded-lg border border-brand-border bg-background px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-brand-photinia">{error}</p>}
        <button
          type="submit"
          disabled={creating}
          className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-xl bg-brand-green text-white font-rubik font-bold text-sm disabled:opacity-50"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> {creating ? t('memories.creating') : t('memories.create')}
        </button>
      </form>

      {/* List */}
      {loading ? (
        <p className="text-sm text-brand-gray">{t('common.loading')}</p>
      ) : profiles.length === 0 ? (
        <p className="text-sm text-brand-gray text-center py-8">{t('memories.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {profiles.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border border-brand-border bg-surface px-3 py-2.5">
              <Link href={`/memories/${p.slug}/edit`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-photinia-light text-brand-photinia shrink-0">
                  <Flower2 className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block font-rubik font-semibold text-sm truncate">{p.name}</span>
                  <span className="block text-xs text-brand-gray truncate">
                    {p.subtitle || `${p.postCount} ${p.postCount === 1 ? 'post' : 'posts'}`}
                  </span>
                </span>
              </Link>
              <Link href={`/memories/${p.slug}`} target="_blank" aria-label={t('memories.viewPublic')} className="p-1.5 text-brand-gray hover:text-brand-green">
                <ExternalLink className="h-4 w-4" />
              </Link>
              <Link href={`/memories/${p.slug}/edit`} className="p-1 text-brand-gray">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
