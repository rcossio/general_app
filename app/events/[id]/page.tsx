import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, MapPin } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getPublicUrl } from '@/lib/storage'
import { renderRichText } from '@/lib/richtext/render'
import { ImageCarousel } from '@/components/ImageCarousel'
import { getEventType } from '@/modules/events/lib/categories'
import { EventOwnerActions } from '@/modules/events/components/EventOwnerActions'

type Params = { params: Promise<{ id: string }> }

// Fixed to the audience's locale/timezone so SSR output is deterministic.
function formatWhen(startAt: Date, endAt: Date | null): string {
  const opts: Intl.DateTimeFormatOptions = { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Rome' }
  const start = startAt.toLocaleString('it-IT', opts)
  if (!endAt) return start
  return `${start} – ${endAt.toLocaleString('it-IT', opts)}`
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const ev = await prisma.event.findUnique({ where: { id }, select: { title: true } })
  return { title: ev ? `${ev.title} — Events` : 'Event' }
}

export default async function EventPublicPage({ params }: Params) {
  const { id } = await params
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true, title: true, type: true, content: true, images: true,
      startAt: true, endAt: true, locationLabel: true,
    },
  })
  if (!event) notFound()

  const cat = getEventType(event.type)

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-8">
      <div className="flex items-center justify-between mb-4">
        <Link href="/events" className="flex items-center gap-1 text-sm text-brand-gray hover:text-brand-text">
          <ArrowLeft className="h-4 w-4" /> Events
        </Link>
        <EventOwnerActions id={event.id} />
      </div>

      <span className="inline-block rounded-full bg-brand-green-light px-2.5 py-0.5 text-[11px] font-rubik font-bold text-brand-green">
        {cat.key.charAt(0).toUpperCase() + cat.key.slice(1)}
      </span>
      <h1 className="mt-2 font-rubik font-extrabold text-2xl md:text-3xl text-brand-text">{event.title}</h1>

      <div className="mt-2 space-y-1 text-sm text-brand-gray">
        <p className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 shrink-0" /> {formatWhen(event.startAt, event.endAt)}</p>
        {event.locationLabel && (
          <p className="flex items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0" /> {event.locationLabel}</p>
        )}
      </div>

      <div className="mt-5">
        <ImageCarousel images={event.images.map((k) => getPublicUrl(k))} />
      </div>

      <div
        className="mt-4 text-brand-text leading-relaxed [&_h2]:font-rubik [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_p]:mb-3 [&_strong]:font-bold [&_em]:italic [&_a]:text-brand-green [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:border-brand-green [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-brand-gray [&_blockquote]:my-3"
        dangerouslySetInnerHTML={{ __html: renderRichText(event.content) }}
      />
    </div>
  )
}
