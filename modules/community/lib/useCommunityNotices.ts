import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { NoticeView } from '@/modules/community/components/CommunityMap'

export interface Quota {
  usedToday: number
  usedWeek: number
  dailyMax: number
  weeklyMax: number
  canPost: boolean
}

export interface CreateNoticeInput {
  category: string
  lat: number
  lng: number
  note?: string
  photoKey: string
}

export type CreateResult = { ok: true; notice: NoticeView } | { ok: false; code: string }

// Parse a JSON body without throwing on empty/HTML responses (e.g. a 502 from
// Nginx returns HTML, which would make res.json() reject).
async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

// Owns the Community notices data + the notice API calls (list, quota, create,
// delete, mark-fixed). The page keeps the UI/photo state and orchestrates these.
export function useCommunityNotices() {
  const { user, fetchWithAuth } = useAuth()
  const [notices, setNotices] = useState<NoticeView[]>([])
  const [quota, setQuota] = useState<Quota | null>(null)
  // True when the notice list failed to load (offline, 5xx, malformed body) so
  // the page can show a retry affordance instead of a silently empty map.
  const [loadError, setLoadError] = useState(false)

  const loadNotices = useCallback(async () => {
    try {
      const res = await fetch('/api/community/notices')
      const body = await readJson<{ data: { notices: NoticeView[] } }>(res)
      if (res.ok && body?.data?.notices) {
        setNotices(body.data.notices)
        setLoadError(false)
      } else {
        setLoadError(true)
      }
    } catch {
      setLoadError(true)
    }
  }, [])

  const reloadQuota = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetchWithAuth('/api/community/notices/quota')
      if (!res.ok) return
      const body = await readJson<{ data: Quota }>(res)
      if (body?.data) setQuota(body.data)
    } catch {
      /* non-critical: leave the previous quota in place */
    }
  }, [user, fetchWithAuth])

  useEffect(() => {
    loadNotices()
  }, [loadNotices])
  useEffect(() => {
    reloadQuota()
  }, [reloadQuota])

  const createNotice = useCallback(
    async (input: CreateNoticeInput): Promise<CreateResult> => {
      try {
        const res = await fetchWithAuth('/api/community/notices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...input, note: input.note?.trim() || undefined }),
        })
        const body = await readJson<{ data?: { notice: NoticeView }; code?: string }>(res)
        if (!res.ok) return { ok: false, code: body?.code ?? 'ERROR' }
        const notice = body?.data?.notice
        if (!notice) return { ok: false, code: 'ERROR' }
        setNotices((prev) => [notice, ...prev])
        reloadQuota()
        return { ok: true, notice }
      } catch {
        return { ok: false, code: 'NETWORK' }
      }
    },
    [fetchWithAuth, reloadQuota]
  )

  const deleteNotice = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetchWithAuth(`/api/community/notices/${id}`, { method: 'DELETE' })
        if (res.ok) {
          setNotices((prev) => prev.filter((x) => x.id !== id))
          reloadQuota()
        }
        return res.ok
      } catch {
        return false
      }
    },
    [fetchWithAuth, reloadQuota]
  )

  const markFixed = useCallback(
    async (id: string, keys: { beforePhotoKey: string; afterPhotoKey: string }): Promise<NoticeView | null> => {
      try {
        const res = await fetchWithAuth(`/api/community/notices/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(keys),
        })
        if (!res.ok) return null
        const body = await readJson<{ data: { notice: NoticeView } }>(res)
        const updated = body?.data?.notice
        if (!updated) return null
        setNotices((prev) => prev.map((x) => (x.id === id ? { ...x, ...updated } : x)))
        return updated
      } catch {
        return null
      }
    },
    [fetchWithAuth]
  )

  return { notices, quota, loadError, reloadNotices: loadNotices, reloadQuota, createNotice, deleteNotice, markFixed }
}
