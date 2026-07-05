import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireAuth, isNextResponse } from '@/lib/permissions'
import { getUserFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { parseJson } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { eventSchema, isValidEventImageKey } from '@/modules/events/lib/schemas'

type Params = { params: Promise<{ id: string }> }

// GET — public single event.
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = getUserFromRequest(request)

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true, userId: true, title: true, type: true, content: true, images: true,
      startAt: true, endAt: true, locationLabel: true, lat: true, lng: true,
    },
  })
  if (!event) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

  const { userId, ...pub } = event
  return NextResponse.json({ data: { event: { ...pub, isOwner: !!user && userId === user.sub } } })
}

// Load an event and confirm the caller owns it (or is an admin).
async function authorizeOwner(request: NextRequest, id: string) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, userId: true } })
  if (!event) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  if (event.userId !== result.user.sub && !isAdminRole(result.user.roles)) {
    return NextResponse.json({ error: 'Forbidden', code: 'PERMISSION_DENIED' }, { status: 403 })
  }
  return { id: event.id }
}

// PATCH — edit an event (owner or admin).
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await authorizeOwner(request, id)
  if (isNextResponse(auth)) return auth

  const input = await parseJson(request, eventSchema)
  if (isNextResponse(input)) return input
  if (!input.images.every(isValidEventImageKey)) {
    return NextResponse.json({ error: 'Invalid image key', code: 'BAD_REQUEST' }, { status: 400 })
  }

  await prisma.event.update({
    where: { id: auth.id },
    data: {
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
  })
  return NextResponse.json({ data: { ok: true } })
}

// DELETE — remove an event (owner or admin).
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await authorizeOwner(request, id)
  if (isNextResponse(auth)) return auth
  await prisma.event.delete({ where: { id: auth.id } })
  return NextResponse.json({ data: { deleted: true } })
}
