'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useTheme } from '@/contexts/ThemeContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { LOCALES } from '@/locales'
import { Sun, Moon, Monitor } from 'lucide-react'
import { z } from 'zod'

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileForm />
    </ProtectedRoute>
  )
}

function ProfileForm() {
  const { user, fetchWithAuth, logout } = useAuth()
  const { t, locale, setLocale } = useLocale()
  const { mode, setMode } = useTheme()
  const router = useRouter()
  const [name, setName] = useState(user?.name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const profileSchema = z.object({
    name: z.string().min(1, t('auth.nameRequired')).max(100),
    avatarUrl: z.string().url().optional().or(z.literal('')),
  })

  const resizeImage = (file: File, maxSize: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('resize failed')), 'image/webp', 0.85)
      }
      img.onerror = reject
      img.src = url
    })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, avatar: t('profile.avatarTooLarge') }))
      return
    }
    setUploading(true)
    setErrors((prev) => { const n = { ...prev }; delete n.avatar; return n })
    try {
      const resized = await resizeImage(file, 256)
      const res = await fetchWithAuth('/api/upload/avatar', { method: 'POST' })
      const { data } = await res.json()
      await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/webp' },
        body: resized,
      })
      const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${data.key}`
      setAvatarUrl(publicUrl)
      await fetchWithAuth('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatarUrl: publicUrl }),
      })
    } catch {
      setErrors((prev) => ({ ...prev, avatar: t('profile.avatarUploadFailed') }))
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = profileSchema.safeParse({ name, avatarUrl: avatarUrl || undefined })
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      for (const err of parsed.error.issues) errs[err.path[0] as string] = err.message
      setErrors(errs)
      return
    }
    setErrors({})
    setLoading(true)
    try {
      await fetchWithAuth('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-rubik font-bold mb-6">{t('profile.title')}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar picker */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-brand-border hover:border-brand-green transition-colors flex-shrink-0 disabled:opacity-50"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">👤</span>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
          <div>
            <p className="text-sm font-medium">{t('profile.avatarUrl')}</p>
            <p className="text-xs text-brand-gray mt-0.5">{t('profile.avatarHint')}</p>
            {errors.avatar && <p className="mt-1 text-xs text-red-500">{errors.avatar}</p>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('auth.name')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-brand-border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>
        {success && <div className="p-3 rounded-lg bg-brand-green-light text-brand-green text-sm">{t('profile.updated')}</div>}
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-brand-photinia hover:bg-brand-photinia-dark disabled:opacity-50 text-white font-rubik font-bold rounded-lg transition-colors"
        >
          {loading ? t('common.saving') : t('common.save')}
        </button>
      </form>

      <div className="mt-8 p-4 rounded-xl border border-brand-border bg-surface">
        <p className="text-sm text-brand-gray mb-1">{t('profile.email')}</p>
        <p className="font-medium">{user?.email}</p>
        <p className="text-sm text-brand-gray mt-3 mb-1">{t('profile.roles')}</p>
        <div className="flex flex-wrap gap-2">
          {user?.roles.map((r) => (
            <span key={r} className="px-2 py-0.5 bg-brand-green-light text-brand-green rounded-full text-xs">{r}</span>
          ))}
        </div>
      </div>

      {/* Language selector */}
      <div className="mt-6 p-4 rounded-xl border border-brand-border bg-surface">
        <p className="text-sm font-medium mb-3">{t('profile.language')}</p>
        <div className="flex gap-2">
          {LOCALES.map((l) => (
            <button
              key={l.value}
              onClick={() => setLocale(l.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                locale === l.value
                  ? 'border-brand-photinia bg-brand-photinia text-white'
                  : 'border-brand-border hover:border-brand-green'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Theme selector */}
      <div className="mt-6 p-4 rounded-xl border border-brand-border bg-surface">
        <p className="text-sm font-medium mb-3">{t('profile.theme')}</p>
        <div className="flex gap-2">
          {([
            { value: 'light' as const, label: t('profile.themeLight'), icon: Sun },
            { value: 'dark' as const, label: t('profile.themeDark'), icon: Moon },
            { value: 'system' as const, label: t('profile.themeSystem'), icon: Monitor },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                mode === opt.value
                  ? 'border-brand-photinia bg-brand-photinia text-white'
                  : 'border-brand-border hover:border-brand-green'
              }`}
            >
              <opt.icon className="h-4 w-4" />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={logout}
          className="w-full px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
        >
          {t('auth.logOut')}
        </button>
      </div>

      {/* Delete account — collapsible danger zone */}
      <div className="mt-10 pt-6 border-t border-brand-border">
        <button
          onClick={() => { setDeleteOpen((v) => !v); setDeleteConfirm('') }}
          className="text-sm text-brand-gray hover:text-red-500 transition-colors"
        >
          {t('profile.deleteAccount')}
        </button>
        {deleteOpen && (
          <div className="mt-3 p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 space-y-3">
            <p className="text-sm text-red-600 dark:text-red-400">{t('profile.deleteAccountWarning')}</p>
            <p className="text-xs text-brand-gray">{t('profile.deleteAccountConfirm', { name: user?.name ?? '' })}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={user?.name ?? ''}
                className="flex-1 px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                onClick={async () => {
                  setDeleting(true)
                  try {
                    await fetchWithAuth('/api/auth/delete-account', { method: 'POST' })
                    await logout()
                    router.push('/')
                  } finally {
                    setDeleting(false)
                  }
                }}
                disabled={deleteConfirm !== user?.name || deleting}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                {t('profile.deleteAccount')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
