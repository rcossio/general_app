import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { resizeToBlob } from '@/lib/imageResize'
import type { MemorialSummary, MemorialProfileView } from './types'
import type { PostInput } from './schemas'

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

// Resolve a stored R2 image key to its public URL (client-side).
export function memoryImageUrl(key: string): string {
  return `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
}

export interface ProfileForm {
  name: string
  subtitle: string
  facebook: string
  instagram: string
  tiktok: string
}

// ---- "My memorials" list + create (used by /memories) ---------------------
export function useMemories() {
  const { fetchWithAuth } = useAuth()
  const [profiles, setProfiles] = useState<MemorialSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/memories')
      const body = await readJson<{ data: { profiles: MemorialSummary[] } }>(res)
      if (res.ok && body?.data) {
        setProfiles(body.data.profiles)
        setLoadError(false)
      } else {
        setLoadError(true)
      }
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [fetchWithAuth])

  useEffect(() => {
    load()
  }, [load])

  const create = useCallback(
    async (name: string, subtitle: string): Promise<string | null> => {
      try {
        const res = await fetchWithAuth('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, subtitle: subtitle || undefined }),
        })
        const body = await readJson<{ data?: { slug: string } }>(res)
        return res.ok ? body?.data?.slug ?? null : null
      } catch {
        return null
      }
    },
    [fetchWithAuth]
  )

  return { profiles, loading, loadError, reload: load, create }
}

// ---- Single-profile editor (used by /memories/[slug]/edit) ----------------
type EditorStatus = 'loading' | 'ready' | 'notfound' | 'forbidden' | 'error'

export function useMemorialEditor(slug: string) {
  const { fetchWithAuth } = useAuth()
  const [profile, setProfile] = useState<MemorialProfileView | null>(null)
  const [status, setStatus] = useState<EditorStatus>('loading')

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/memories/${slug}`)
      if (res.status === 404) return setStatus('notfound')
      const body = await readJson<{ data: { profile: MemorialProfileView } }>(res)
      if (!res.ok || !body?.data) return setStatus('error')
      if (!body.data.profile.isOwner) return setStatus('forbidden')
      setProfile(body.data.profile)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [slug, fetchWithAuth])

  useEffect(() => {
    load()
  }, [load])

  const saveProfile = useCallback(
    async (form: ProfileForm): Promise<boolean> => {
      const res = await fetchWithAuth(`/api/memories/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) await load()
      return res.ok
    },
    [slug, fetchWithAuth, load]
  )

  const savePost = useCallback(
    async (payload: PostInput, postId?: string): Promise<boolean> => {
      const url = postId ? `/api/memories/${slug}/posts/${postId}` : `/api/memories/${slug}/posts`
      const res = await fetchWithAuth(url, {
        method: postId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) await load()
      return res.ok
    },
    [slug, fetchWithAuth, load]
  )

  const deletePost = useCallback(
    async (postId: string): Promise<boolean> => {
      const res = await fetchWithAuth(`/api/memories/${slug}/posts/${postId}`, { method: 'DELETE' })
      if (res.ok) await load()
      return res.ok
    },
    [slug, fetchWithAuth, load]
  )

  const deleteProfile = useCallback(async (): Promise<boolean> => {
    const res = await fetchWithAuth(`/api/memories/${slug}`, { method: 'DELETE' })
    return res.ok
  }, [slug, fetchWithAuth])

  // Resize + upload one image, returning its stored R2 key (or null on failure).
  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const blob = await resizeToBlob(file, { maxDim: 1600, type: 'image/jpeg', quality: 0.82 })
        const urlRes = await fetchWithAuth('/api/memories/upload-url', { method: 'POST' })
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

  return { profile, status, reload: load, saveProfile, savePost, deletePost, deleteProfile, uploadImage }
}
