'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'

interface EventRequest {
  id: string
  message: string | null
  createdAt: string
  user: { name: string; email: string }
}

// Admin review queue for event-publishing requests. Self-contained so it can be
// dropped into the admin page. Approving grants the user events:unlimited.
export function EventRequestsPanel() {
  const { fetchWithAuth } = useAuth()
  const { t } = useLocale()
  const [requests, setRequests] = useState<EventRequest[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/admin/event-requests')
      if (res.ok) setRequests((await res.json()).data.requests)
    } catch {
      /* ignore */
    } finally {
      setLoaded(true)
    }
  }, [fetchWithAuth])

  useEffect(() => {
    load()
  }, [load])

  const review = async (id: string, action: 'approve' | 'deny') => {
    const res = await fetchWithAuth(`/api/admin/event-requests/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) setRequests((prev) => prev.filter((r) => r.id !== id))
  }

  // Hide the whole section until loaded, and when empty keep it quiet.
  if (!loaded) return null

  return (
    <section className="mb-8 rounded-xl border border-brand-border bg-surface p-4">
      <h2 className="font-rubik font-bold text-sm mb-3">{t('events.adminRequests')}</h2>
      {requests.length === 0 ? (
        <p className="text-xs text-brand-gray">{t('events.noRequests')}</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="flex items-start gap-3 rounded-lg border border-brand-border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-rubik font-semibold truncate">{r.user.name}</p>
                <p className="text-xs text-brand-gray truncate">{r.user.email}</p>
                {r.message && <p className="mt-1 text-sm text-brand-text">{r.message}</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => review(r.id, 'approve')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-green text-white text-xs font-rubik font-bold">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> {t('events.approve')}
                </button>
                <button onClick={() => review(r.id, 'deny')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-border text-brand-text text-xs font-rubik font-bold">
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} /> {t('events.deny')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
