'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import Link from 'next/link'
import { Plus, BarChart2 } from 'lucide-react'

interface Entry {
  id: string
  type: string
  title: string
  content: string | null
  score: number
  tags: string[]
  createdAt: string
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
  const [entries, setEntries] = useState<Entry[]>([])
  const [filter, setFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const load = async (type: string) => {
    setLoading(true)
    const url = `/api/tracker/entries?limit=20${type ? `&type=${type}` : ''}`
    const res = await fetchWithAuth(url)
    const body = await res.json()
    setEntries(body.data?.entries ?? [])
    setLoading(false)
  }

  useEffect(() => { load(filter) }, [filter])

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Life Tracker</h1>
        <Link href="/tracker/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
          <Plus className="h-4 w-4" /> New Entry
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              filter === t
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <BarChart2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No entries yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="flex items-start justify-between gap-3 mb-1">
                <p className="font-semibold">{e.title}</p>
                <span className="text-lg font-bold text-blue-600">{e.score}<span className="text-xs text-gray-400">/10</span></span>
              </div>
              {e.content && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{e.content}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[e.type] ?? ''}`}>
                  {e.type}
                </span>
                {e.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-500">{tag}</span>
                ))}
                <span className="text-xs text-gray-400 ml-auto">{new Date(e.createdAt).toLocaleDateString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
