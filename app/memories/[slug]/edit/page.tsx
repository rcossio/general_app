'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, QrCode, Trash2, Plus, Pencil, MapPin, Loader2 } from 'lucide-react'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { useLocale } from '@/contexts/LocaleContext'
import { useMemorialEditor, memoryImageUrl, type ProfileForm } from '@/modules/memories/lib/useMemories'
import { PostEditor } from '@/modules/memories/components/PostEditor'
import { excerpt } from '@/lib/richtext/excerpt'
import type { PostInput } from '@/modules/memories/lib/schemas'

export default function MemorialEditPage() {
  return (
    <ProtectedRoute>
      <Editor />
    </ProtectedRoute>
  )
}

function Editor() {
  const { t } = useLocale()
  const router = useRouter()
  const slug = String(useParams().slug)
  const { profile, status, saveProfile, savePost, deletePost, deleteProfile, uploadImage } = useMemorialEditor(slug)

  const [form, setForm] = useState<ProfileForm | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [editing, setEditing] = useState<'new' | string | null>(null)
  const [qrBusy, setQrBusy] = useState(false)

  // Owner-only page: bounce non-owners to the public view.
  useEffect(() => {
    if (status === 'forbidden') router.replace(`/memories/${slug}`)
  }, [status, slug, router])

  // Sync the profile form when the profile (re)loads.
  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name,
        subtitle: profile.subtitle ?? '',
        facebook: profile.facebook ?? '',
        instagram: profile.instagram ?? '',
        tiktok: profile.tiktok ?? '',
      })
    }
  }, [profile])

  if (status === 'notfound') return <div className="p-6 text-center text-sm text-brand-gray">{t('memories.notFound')}</div>
  if (status === 'error') return <div className="p-6 text-center text-sm text-brand-gray">{t('memories.loadError')}</div>
  if (status !== 'ready' || !profile || !form) {
    return <div className="p-6 text-center text-sm text-brand-gray">{t('common.loading')}</div>
  }

  const set = (k: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const onSaveProfile = async () => {
    if (!form.name.trim()) return setProfileMsg(t('memories.nameRequired'))
    setSavingProfile(true)
    setProfileMsg(null)
    const ok = await saveProfile(form)
    setSavingProfile(false)
    setProfileMsg(ok ? t('memories.saved') : t('memories.saveError'))
  }

  const onDeleteProfile = async () => {
    if (!window.confirm(t('memories.confirmDeleteProfile', { name: profile.name }))) return
    if (await deleteProfile()) router.push('/memories')
  }

  const onDownloadQr = async () => {
    setQrBusy(true)
    try {
      // Lazy-load jspdf/qrcode only when the button is used, keeping them out of
      // the editor's initial bundle.
      const { downloadQrPdf } = await import('@/modules/memories/lib/qrPdf')
      await downloadQrPdf(`${window.location.origin}/memories/${slug}`, profile.name, profile.subtitle)
    } finally {
      setQrBusy(false)
    }
  }

  const onSavePost = async (payload: PostInput): Promise<boolean> => {
    const ok = await savePost(payload, editing && editing !== 'new' ? editing : undefined)
    if (ok) setEditing(null)
    return ok
  }

  const pill = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border text-brand-text font-rubik font-bold text-xs hover:bg-brand-green-light'

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <Link href="/memories" className="flex items-center gap-1 text-sm text-brand-gray hover:text-brand-text">
          <ArrowLeft className="h-4 w-4" /> {t('memories.myMemorials')}
        </Link>
        <div className="flex items-center gap-1.5">
          <Link href={`/memories/${slug}`} target="_blank" className={pill}>
            <ExternalLink className="h-4 w-4" strokeWidth={2.5} /> {t('memories.viewPublic')}
          </Link>
          <button onClick={onDownloadQr} disabled={qrBusy} className={`${pill} disabled:opacity-50`}>
            {qrBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" strokeWidth={2.5} />}
            {qrBusy ? t('memories.generatingQr') : t('memories.downloadQr')}
          </button>
        </div>
      </div>

      {/* Profile details */}
      <section className="rounded-2xl border border-brand-border bg-surface p-4 space-y-3 mb-6">
        <p className="font-rubik font-bold text-sm">{t('memories.profileDetails')}</p>
        <div>
          <label className="block text-xs font-rubik font-bold text-brand-gray mb-1">{t('memories.personName')}</label>
          <input value={form.name} onChange={set('name')} maxLength={120} className="w-full rounded-lg border border-brand-border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-rubik font-bold text-brand-gray mb-1">{t('memories.subtitle')}</label>
          <input value={form.subtitle} onChange={set('subtitle')} maxLength={200} placeholder={t('memories.subtitlePlaceholder')} className="w-full rounded-lg border border-brand-border bg-background px-3 py-2 text-sm" />
        </div>
        <p className="text-xs font-rubik font-bold text-brand-gray pt-1">{t('memories.socialLinks')}</p>
        <input value={form.facebook} onChange={set('facebook')} placeholder="https://facebook.com/…" className="w-full rounded-lg border border-brand-border bg-background px-3 py-2 text-sm" />
        <input value={form.instagram} onChange={set('instagram')} placeholder="https://instagram.com/…" className="w-full rounded-lg border border-brand-border bg-background px-3 py-2 text-sm" />
        <input value={form.tiktok} onChange={set('tiktok')} placeholder="https://tiktok.com/@…" className="w-full rounded-lg border border-brand-border bg-background px-3 py-2 text-sm" />
        <div className="flex items-center gap-3">
          <button onClick={onSaveProfile} disabled={savingProfile} className="px-4 py-2.5 rounded-xl bg-brand-green text-white font-rubik font-bold text-sm disabled:opacity-50">
            {savingProfile ? t('common.saving') : t('common.save')}
          </button>
          {profileMsg && <span className="text-xs text-brand-gray">{profileMsg}</span>}
        </div>
      </section>

      {/* Posts */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-rubik font-bold text-sm">{t('memories.posts')}</p>
          {editing !== 'new' && (
            <button onClick={() => setEditing('new')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-photinia text-white font-rubik font-bold text-xs">
              <Plus className="h-4 w-4" strokeWidth={2.5} /> {t('memories.addPost')}
            </button>
          )}
        </div>

        {editing === 'new' && (
          <PostEditor uploadImage={uploadImage} onSave={onSavePost} onCancel={() => setEditing(null)} />
        )}

        {profile.posts.length === 0 && editing !== 'new' && (
          <p className="text-sm text-brand-gray text-center py-6">{t('memories.noPosts')}</p>
        )}

        {profile.posts.map((post) =>
          editing === post.id ? (
            <PostEditor key={post.id} initial={post} uploadImage={uploadImage} onSave={onSavePost} onCancel={() => setEditing(null)} />
          ) : (
            <div key={post.id} className="flex gap-3 rounded-2xl border border-brand-border bg-surface p-3">
              {post.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element -- R2 thumbnail via plain <img>
                <img src={memoryImageUrl(post.images[0])} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-brand-text line-clamp-2">{excerpt(post.content) || '—'}</p>
                {post.locationLabel && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-brand-gray"><MapPin className="h-3.5 w-3.5" /> {post.locationLabel}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => setEditing(post.id)} aria-label={t('memories.editPost')} className="p-1.5 rounded-lg border border-brand-border text-brand-gray hover:text-brand-text">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => onDeletePost(post.id)} aria-label={t('memories.deletePost')} className="p-1.5 rounded-lg border border-brand-border text-brand-photinia">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        )}
      </section>

      {/* Danger zone */}
      <div className="mt-10 border-t border-brand-border pt-4">
        <button onClick={onDeleteProfile} className="flex items-center gap-1.5 text-sm text-brand-photinia font-rubik font-bold">
          <Trash2 className="h-4 w-4" strokeWidth={2.5} /> {t('memories.deleteProfile')}
        </button>
      </div>
    </div>
  )

  async function onDeletePost(id: string) {
    if (window.confirm(t('memories.confirmDeletePost'))) await deletePost(id)
  }
}
