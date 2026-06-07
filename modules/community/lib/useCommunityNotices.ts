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

// Owns the Community notices data + the notice API calls (list, quota, create,
// delete, mark-fixed). The page keeps the UI/photo state and orchestrates these.
export function useCommunityNotices() {
  const { user, fetchWithAuth } = useAuth()
  const [notices, setNotices] = useState<NoticeView[]>([])
  const [quota, setQuota] = useState<Quota | null>(null)

  const loadNotices = useCallback(async () => {
    const res = await fetch('/api/community/notices')
    if (res.ok) setNotices((await res.json()).data.notices)
  }, [])

  const reloadQuota = useCallback(async () => {
    if (!user) return
    const res = await fetchWithAuth('/api/community/notices/quota')
    if (res.ok) setQuota((await res.json()).data)
  }, [user, fetchWithAuth])

  useEffect(() => {
    loadNotices()
  }, [loadNotices])
  useEffect(() => {
    reloadQuota()
  }, [reloadQuota])

  const createNotice = useCallback(
    async (input: CreateNoticeInput): Promise<CreateResult> => {
      const res = await fetchWithAuth('/api/community/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, note: input.note?.trim() || undefined }),
      })
      const body = await res.json()
      if (!res.ok) return { ok: false, code: body.code ?? 'ERROR' }
      const notice = body.data.notice as NoticeView
      setNotices((prev) => [notice, ...prev])
      reloadQuota()
      return { ok: true, notice }
    },
    [fetchWithAuth, reloadQuota]
  )

  const deleteNotice = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await fetchWithAuth(`/api/community/notices/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setNotices((prev) => prev.filter((x) => x.id !== id))
        reloadQuota()
      }
      return res.ok
    },
    [fetchWithAuth, reloadQuota]
  )

  const markFixed = useCallback(
    async (id: string, keys: { beforePhotoKey: string; afterPhotoKey: string }): Promise<NoticeView | null> => {
      const res = await fetchWithAuth(`/api/community/notices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keys),
      })
      if (!res.ok) return null
      const updated = (await res.json()).data.notice as NoticeView
      setNotices((prev) => prev.map((x) => (x.id === id ? { ...x, ...updated } : x)))
      return updated
    },
    [fetchWithAuth]
  )

  return { notices, quota, reloadQuota, createNotice, deleteNotice, markFixed }
}
