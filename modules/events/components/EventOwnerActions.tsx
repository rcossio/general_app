'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'

// On the public SSR event page we don't know server-side whether the viewer owns
// the event (auth is a Bearer token held client-side). This tiny client check
// asks the API and shows an Edit link only to the owner/admin.
export function EventOwnerActions({ id }: { id: string }) {
  const { user, fetchWithAuth } = useAuth()
  const { t } = useLocale()
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetchWithAuth(`/api/events/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (!cancelled && b?.data?.event?.isOwner) setCanEdit(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id, user, fetchWithAuth])

  if (!canEdit) return null
  return (
    <Link href={`/events/${id}/edit`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border text-brand-text font-rubik font-bold text-xs hover:bg-brand-green-light">
      <Pencil className="h-4 w-4" strokeWidth={2.5} /> {t('events.edit')}
    </Link>
  )
}
