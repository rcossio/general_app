import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requirePermission, userHasPermission, isNextResponse } from '@/lib/permissions'
import { getUserFromRequest } from '@/lib/auth'
import { parseJson } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { eventSchema, isValidEventImageKey, WEEKLY_EVENT_MAX, WEEK_MS } from '@/modules/events/lib/schemas'

const LIST_LIMIT = 200

// GET — public feed. Upcoming events first (by start), then recently-started
// ones. userId never exposed; isOwner set when a valid token is present.
export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)

  const events = await prisma.event.findMany({
    orderBy: { startAt: 'desc' },
    take: LIST_LIMIT,
    select: {
      id: true,
      userId: true,
      title: true,
      type: true,
      startAt: true,
      endAt: true,
      locationLabel: true,
      images: true,
    },
  })

  const data = events.map(({ userId, images, ...e }) => ({
    ...e,
    image: images[0] ?? null,
    isOwner: !!user && userId === user.sub,
  }))
  return NextResponse.json(
    { data: { events: data } },
    { headers: { 'Cache-Control': user ? 'private, no-store' : 'public, max-age=30, stale-while-revalidate=60' } }
  )
}

// POST — publish an event. Non-admins without events:unlimited are capped at
// WEEKLY_MAX per rolling 7 days.
export async function POST(request: NextRequest) {
  const result = await requirePermission(request, 'events', 'create')
  if (isNextResponse(result)) return result

  const unlimited = await userHasPermission(result.user, 'events', 'unlimited')
  if (!unlimited) {
    const since = new Date(Date.now() - WEEK_MS)
    const recent = await prisma.event.count({ where: { userId: result.user.sub, createdAt: { gte: since } } })
    if (recent >= WEEKLY_EVENT_MAX) {
      return NextResponse.json({ error: 'Weekly limit reached', code: 'RATE_LIMIT_WEEKLY' }, { status: 429 })
    }
  }

  const input = await parseJson(request, eventSchema)
  if (isNextResponse(input)) return input
  if (!input.images.every(isValidEventImageKey)) {
    return NextResponse.json({ error: 'Invalid image key', code: 'BAD_REQUEST' }, { status: 400 })
  }

  const event = await prisma.event.create({
    data: {
      userId: result.user.sub,
      title: input.title,
      type: input.type,
      content: input.content as Prisma.InputJsonValue,
      images: input.images,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      locationLabel: input.locationLabel || null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
    },
    select: { id: true },
  })
  return NextResponse.json({ data: { id: event.id } }, { status: 201 })
}
