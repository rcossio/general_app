'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Map, CheckCircle, ChevronRight, BookOpen } from 'lucide-react'

interface GameSession {
  id: string
  startedAt: string
  completedAt: string | null
}

interface Game {
  id: string
  slug: string
  title: Record<string, string>
  description: string | null
  chapter: number
  nextGameId: string | null
  session: GameSession | null
}

function resolveI18n(value: Record<string, string>, locale: string): string {
  return value[locale] ?? value['en'] ?? ''
}

export default function AdventurePage() {
  return (
    <ProtectedRoute>
      <AdventureList />
    </ProtectedRoute>
  )
}

function AdventureList() {
  const { fetchWithAuth } = useAuth()
  const { t, locale } = useLocale()
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)

  useEffect(() => {
    fetchWithAuth('/api/adventure/games')
      .then((r) => r.json())
      .then((b) => setGames(b.data ?? []))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlay = async (game: Game) => {
    setStarting(game.id)
    try {
      if (game.session) {
        router.push(`/adventure/${game.session.id}`)
        return
      }
      const res = await fetchWithAuth('/api/adventure/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id }),
      })
      const body = await res.json()
      if (body.data?.sessionId) {
        router.push(`/adventure/${body.data.sessionId}`)
      }
    } finally {
      setStarting(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Map className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">{t('adventure.title')}</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>{t('adventure.noGamesAvailable')}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {games.map((game) => (
            <li
              key={game.id}
              className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {t('adventure.chapter')} {game.chapter}
                    </span>
                    {game.session?.completedAt && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {t('adventure.completed')}
                      </span>
                    )}
                  </div>
                  <h2 className="font-semibold text-lg leading-tight truncate">{resolveI18n(game.title, locale)}</h2>
                  {game.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{game.description}</p>
                  )}
                  {game.session && !game.session.completedAt && (
                    <p className="text-xs text-gray-400 mt-2">
                      Started {new Date(game.session.startedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handlePlay(game)}
                  disabled={starting === game.id}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium shrink-0 transition-colors"
                >
                  {starting === game.id
                    ? '...'
                    : game.session
                    ? t('adventure.resumeGame')
                    : t('adventure.startGame')}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
