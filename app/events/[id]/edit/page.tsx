'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { useLocale } from '@/contexts/LocaleContext'
import { EventForm } from '@/modules/events/components/EventForm'
import { useEventEditor } from '@/modules/events/lib/useEvents'
import type { EventInput } from '@/modules/events/lib/schemas'

export default function EditEventPage() {
  return (
    <ProtectedRoute>
      <EditEvent />
    </ProtectedRoute>
  )
}

function EditEvent() {
  const { t } = useLocale()
  const router = useRouter()
  const id = String(useParams().id)
  const { event, status, save, remove, uploadImage } = useEventEditor(id)

  useEffect(() => {
    if (status === 'forbidden') router.replace(`/events/${id}`)
  }, [status, id, router])

  if (status === 'notfound') return <div className="p-6 text-center text-sm text-brand-gray">{t('events.notFound')}</div>
  if (status === 'error') return <div className="p-6 text-center text-sm text-brand-gray">{t('events.loadError')}</div>
  if (status !== 'ready' || !event) return <div className="p-6 text-center text-sm text-brand-gray">{t('common.loading')}</div>

  const onSubmit = async (input: EventInput): Promise<boolean> => {
    const ok = await save(input)
    if (ok) router.push(`/events/${id}`)
    return !!ok
  }

  const onDelete = async () => {
    if (!window.confirm(t('events.confirmDelete', { title: event.title }))) return
    if (await remove()) router.push('/events')
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <Link href={`/events/${id}`} className="flex items-center gap-1 text-sm text-brand-gray hover:text-brand-text">
          <ArrowLeft className="h-4 w-4" /> {t('events.title')}
        </Link>
        <button onClick={onDelete} className="flex items-center gap-1.5 text-sm text-brand-photinia font-rubik font-bold">
          <Trash2 className="h-4 w-4" strokeWidth={2.5} /> {t('events.deleteEvent')}
        </button>
      </div>
      <h1 className="text-xl font-rubik font-bold mb-5">{t('events.edit')}</h1>
      <EventForm initial={event} uploadImage={uploadImage} onSubmit={onSubmit} submitLabel={t('common.save')} />
    </div>
  )
}
