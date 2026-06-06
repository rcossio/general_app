'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import Link from 'next/link'
import { Plus, BarChart2, Pencil, Trash2, Globe } from 'lucide-react'

interface Entry {
  id: string
  type: string
  title: string
  content: string | null
  score: number
  tags: string[]
  isPublic: boolean
  createdAt: string
}

interface PublicEntry {
  id: string
  type: string
  title: string
  content: string | null
  score: number
  tags: string[]
  createdAt: string
  user: { name: string }
}

interface Stats {
  typeStats: Record<string, { total: number; count: number; avg: number }>
  total: number
}

const TYPES = ['', 'DESIRE', 'EMOTION', 'GOAL', 'ACHIEVEMENT'] as const

const TYPE_COLORS: Record<string, string> = {
  DESIRE: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  EMOTION: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  GOAL: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  ACHIEVEMENT: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
}

export default function TrackerPage() {
  return (
    <ProtectedRoute>
      <TrackerFeed />
    </ProtectedRoute>
  )
}

function TrackerFeed() {
  const { fetchWithAuth } = useAuth()
  const { t } = useLocale()
  const [entries, setEntries] = useState<Entry[]>([])
  const [publicEntries, setPublicEntries] = useState<PublicEntry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filter, setFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const load = async (type: string) => {
    setLoading(true)
    const url = `/api/tracker/entries?limit=20${type ? `&type=${type}` : ''}`
    const pubUrl = `/api/tracker/entries/public?limit=12${type ? `&type=${type}` : ''}`
    const [entriesRes, statsRes, pubRes] = await Promise.all([
      fetchWithAuth(url),
      fetchWithAuth('/api/tracker/stats'),
      fetch(pubUrl),
    ])
    const entriesBody = await entriesRes.json()
    const statsBody = await statsRes.json()
    const pubBody = await pubRes.json()
    setEntries(entriesBody.data?.entries ?? [])
    setStats(statsBody.data ?? null)
    setPublicEntries(pubBody.data?.entries ?? [])
    setLoading(false)
  }

  useEffect(() => { load(filter) }, [filter])

  const deleteEntry = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    await fetchWithAuth(`/api/tracker/entries/${id}`, { method: 'DELETE' })
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t('tracker.title')}</h1>
        <Link href="/tracker/new" className="flex items-center gap-2 px-4 py-2 bg-brand-photinia hover:bg-brand-photinia-dark text-white rounded-lg text-sm font-medium">
          <Plus className="h-4 w-4" /> {t('tracker.newEntry')}
        </Link>
      </div>

      {/* Stats bar */}
      {stats && stats.total > 0 && (
        <div className="mb-5 p-4 rounded-xl border border-brand-border bg-surface">
          <p className="text-xs text-brand-gray mb-3">{stats.total} entries · {t('tracker.avgScores')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(stats.typeStats).map(([type, s]) => (
              <div key={type} className="text-center">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${TYPE_COLORS[type] ?? ''}`}>{type}</span>
                <p className="text-lg font-bold text-brand-photinia">{s.avg.toFixed(1)}</p>
                <p className="text-xs text-brand-gray">{s.count} entries</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {TYPES.map((tp) => (
          <button
            key={tp}
            onClick={() => setFilter(tp)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              filter === tp
                ? 'bg-brand-photinia text-white'
                : 'bg-background text-brand-gray hover:bg-brand-green-light'
            }`}
          >
            {tp || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-brand-border animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-brand-gray">
          <BarChart2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>{t('tracker.noEntriesYet')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="p-4 rounded-xl border border-brand-border bg-surface">
              <div className="flex items-start justify-between gap-3 mb-1">
                <p className="font-semibold">{e.title}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-lg font-bold text-brand-photinia">{e.score}<span className="text-xs text-brand-gray">/10</span></span>
                  {e.isPublic && <Globe className="h-3.5 w-3.5 text-brand-green" aria-label={t('common.public')} />}
                  <Link href={`/tracker/${e.id}`} className="p-1 text-brand-gray hover:text-brand-green"><Pencil className="h-3.5 w-3.5" /></Link>
                  <button onClick={() => deleteEntry(e.id)} className="p-1 text-brand-gray hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              {e.content && <p className="text-sm text-brand-gray mb-2 line-clamp-2">{e.content}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[e.type] ?? ''}`}>
                  {e.type}
                </span>
                {e.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-background text-brand-gray">{tag}</span>
                ))}
                <span className="text-xs text-brand-gray ml-auto">{new Date(e.createdAt).toLocaleDateString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Community feed */}
      {publicEntries.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-brand-green" /> {t('tracker.community')}
          </h2>
          <ul className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {publicEntries.map((e) => (
              <li key={e.id} className="p-4 rounded-xl border border-brand-border bg-surface">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="font-semibold">{e.title}</p>
                  <span className="text-lg font-bold text-brand-green shrink-0">{e.score}<span className="text-xs text-brand-gray">/10</span></span>
                </div>
                {e.content && <p className="text-sm text-brand-gray mb-2 line-clamp-2">{e.content}</p>}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[e.type] ?? ''}`}>{e.type}</span>
                  {e.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-background text-brand-gray">{tag}</span>
                  ))}
                  <span className="text-xs text-brand-gray ml-auto">{t('common.by')} {e.user.name} · {new Date(e.createdAt).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
