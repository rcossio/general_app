import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { AssociationView } from './contact'
import type { AssociationInput } from './schemas'

// Parse a JSON body without throwing on empty/HTML responses (e.g. a 502 from
// Nginx returns HTML, which would make res.json() reject).
async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

// Owns the associations directory data + the admin CRUD calls. The page keeps
// the UI/selection state and orchestrates these.
export function useAssociations() {
  const { fetchWithAuth } = useAuth()
  const [associations, setAssociations] = useState<AssociationView[]>([])
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/associations')
      const body = await readJson<{ data: { associations: AssociationView[] } }>(res)
      if (res.ok && body?.data?.associations) {
        setAssociations(body.data.associations)
        setLoadError(false)
      } else {
        setLoadError(true)
      }
    } catch {
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createAssociation = useCallback(
    async (input: AssociationInput): Promise<AssociationView | null> => {
      try {
        const res = await fetchWithAuth('/api/associations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        const body = await readJson<{ data?: { association: AssociationView } }>(res)
        const created = body?.data?.association
        if (!res.ok || !created) return null
        setAssociations((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        return created
      } catch {
        return null
      }
    },
    [fetchWithAuth]
  )

  const updateAssociation = useCallback(
    async (id: string, input: Partial<AssociationInput>): Promise<AssociationView | null> => {
      try {
        const res = await fetchWithAuth(`/api/associations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        const body = await readJson<{ data?: { association: AssociationView } }>(res)
        const updated = body?.data?.association
        if (!res.ok || !updated) return null
        setAssociations((prev) =>
          prev.map((a) => (a.id === id ? updated : a)).sort((x, y) => x.name.localeCompare(y.name))
        )
        return updated
      } catch {
        return null
      }
    },
    [fetchWithAuth]
  )

  const deleteAssociation = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetchWithAuth(`/api/associations/${id}`, { method: 'DELETE' })
        if (res.ok) setAssociations((prev) => prev.filter((a) => a.id !== id))
        return res.ok
      } catch {
        return false
      }
    },
    [fetchWithAuth]
  )

  return { associations, loadError, reload: load, createAssociation, updateAssociation, deleteAssociation }
}
