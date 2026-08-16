import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { resizeToBlob } from '@/lib/imageResize'
import type { EventSummary, EventView, EventQuota } from './types'
import type { EventInput } from './schemas'

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

export function eventImageUrl(key: string): string {
  return `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
}

// ---- Public feed + (if signed in) the caller's quota / request-more ---------
export function useEventsFeed() {
  const { user, fetchWithAuth } = useAuth()
  const [events, setEvents] = useState<EventSummary[]>([])
  const [quota, setQuota] = useState<EventQuota | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/events')
      const body = await readJson<{ data: { events: EventSummary[] } }>(res)
      if (res.ok && body?.data) {
        setEvents(body.data.events)
        setLoadError(false)
      } else setLoadError(true)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadQuota = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetchWithAuth('/api/events/quota')
      const body = await readJson<{ data: EventQuota }>(res)
      if (res.ok && body?.data) setQuota(body.data)
    } catch {
      /* non-critical */
    }
  }, [user, fetchWithAuth])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])
  useEffect(() => {
    loadQuota()
  }, [loadQuota])

  const requestMore = useCallback(
    async (message: string): Promise<boolean> => {
      try {
        const res = await fetchWithAuth('/api/events/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: message || undefined }),
        })
        if (res.ok) await loadQuota()
        return res.ok
      } catch {
        return false
      }
    },
    [fetchWithAuth, loadQuota]
  )

  return { events, quota, loading, loadError, reload: loadFeed, requestMore }
}

// ---- Single-event editor (create when no id, else edit) ---------------------
type EditorStatus = 'loading' | 'ready' | 'notfound' | 'forbidden' | 'error'

export function useEventEditor(id?: string) {
  const { fetchWithAuth } = useAuth()
  const [event, setEvent] = useState<EventView | null>(null)
  const [status, setStatus] = useState<EditorStatus>(id ? 'loading' : 'ready')

  const load = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetchWithAuth(`/api/events/${id}`)
      if (res.status === 404) return setStatus('notfound')
      const body = await readJson<{ data: { event: EventView } }>(res)
      if (!res.ok || !body?.data) return setStatus('error')
      if (!body.data.event.isOwner) return setStatus('forbidden')
      setEvent(body.data.event)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [id, fetchWithAuth])

  useEffect(() => {
    load()
  }, [load])

  // Returns the event id on success (new or existing), or null.
  const save = useCallback(
    async (input: EventInput): Promise<string | null> => {
      const url = id ? `/api/events/${id}` : '/api/events'
      const res = await fetchWithAuth(url, {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) return null
      if (id) return id
      const body = await readJson<{ data?: { id: string } }>(res)
      return body?.data?.id ?? null
    },
    [id, fetchWithAuth]
  )

  const remove = useCallback(async (): Promise<boolean> => {
    if (!id) return false
    const res = await fetchWithAuth(`/api/events/${id}`, { method: 'DELETE' })
    return res.ok
  }, [id, fetchWithAuth])

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const blob = await resizeToBlob(file, { maxDim: 1600, type: 'image/jpeg', quality: 0.82 })
        const urlRes = await fetchWithAuth('/api/events/upload-url', { method: 'POST' })
        if (!urlRes.ok) return null
        const { uploadUrl, key } = (await urlRes.json()).data
        const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob })
        return put.ok ? key : null
      } catch {
        return null
      }
    },
    [fetchWithAuth]
  )

  return { event, status, save, remove, uploadImage }
}
