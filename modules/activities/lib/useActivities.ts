import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { ActivityView } from './types'
import type { ActivityInput } from './schemas'

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

// Owns the activities directory data + admin CRUD (mirrors useAssociations).
export function useActivities() {
  const { fetchWithAuth } = useAuth()
  const [activities, setActivities] = useState<ActivityView[]>([])
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/activities')
      const body = await readJson<{ data: { activities: ActivityView[] } }>(res)
      if (res.ok && body?.data?.activities) {
        setActivities(body.data.activities)
        setLoadError(false)
      } else setLoadError(true)
    } catch {
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createActivity = useCallback(
    async (input: ActivityInput): Promise<ActivityView | null> => {
      try {
        const res = await fetchWithAuth('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        const body = await readJson<{ data?: { activity: ActivityView } }>(res)
        const created = body?.data?.activity
        if (!res.ok || !created) return null
        setActivities((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        return created
      } catch {
        return null
      }
    },
    [fetchWithAuth]
  )

  const updateActivity = useCallback(
    async (id: string, input: Partial<ActivityInput>): Promise<ActivityView | null> => {
      try {
        const res = await fetchWithAuth(`/api/activities/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        const body = await readJson<{ data?: { activity: ActivityView } }>(res)
        const updated = body?.data?.activity
        if (!res.ok || !updated) return null
        setActivities((prev) => prev.map((a) => (a.id === id ? updated : a)).sort((x, y) => x.name.localeCompare(y.name)))
        return updated
      } catch {
        return null
      }
    },
    [fetchWithAuth]
  )

  const deleteActivity = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetchWithAuth(`/api/activities/${id}`, { method: 'DELETE' })
        if (res.ok) setActivities((prev) => prev.filter((a) => a.id !== id))
        return res.ok
      } catch {
        return false
      }
    },
    [fetchWithAuth]
  )

  return { activities, loadError, reload: load, createActivity, updateActivity, deleteActivity }
}
