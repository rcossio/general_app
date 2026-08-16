'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { useLocale } from '@/contexts/LocaleContext'
import { EventForm } from '@/modules/events/components/EventForm'
import { useEventEditor } from '@/modules/events/lib/useEvents'
import type { EventInput } from '@/modules/events/lib/schemas'

export default function NewEventPage() {
  return (
    <ProtectedRoute>
      <NewEvent />
    </ProtectedRoute>
  )
}

function NewEvent() {
  const { t } = useLocale()
  const router = useRouter()
  const { save, uploadImage } = useEventEditor()

  const onSubmit = async (input: EventInput): Promise<boolean> => {
    const id = await save(input)
    if (id) router.push(`/events/${id}`)
    return !!id
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <Link href="/events" className="flex items-center gap-1 text-sm text-brand-gray hover:text-brand-text mb-4">
        <ArrowLeft className="h-4 w-4" /> {t('events.title')}
      </Link>
      <h1 className="text-xl font-rubik font-bold mb-5">{t('events.create')}</h1>
      <EventForm uploadImage={uploadImage} onSubmit={onSubmit} submitLabel={t('events.save')} />
    </div>
  )
}
