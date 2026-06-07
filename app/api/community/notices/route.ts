import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPublicUrl } from '@/lib/storage'
import { createNoticeSchema, isValidPhotoKey } from '@/modules/community/lib/schemas'

const BYPASS_ROLES = ['master_admin', 'admin']
const LIST_LIMIT = 1000
const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS
const FIXED_WINDOW_MS = 14 * DAY_MS // fixed notices linger on the map this long

// GET — public list of open notices for the map (no auth required).
// If a valid token is present, each notice is flagged isOwn for the owner UI.
export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request) // may be null (public endpoint)

  const notices = await prisma.communityNotice.findMany({
    where: {
      OR: [
        { status: 'open' },
        { status: 'fixed', fixedAt: { gte: new Date(Date.now() - FIXED_WINDOW_MS) } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
    select: {
      id: true,
      userId: true,
      category: true,
      lat: true,
      lng: true,
      note: true,
      photoUrl: true,
      status: true,
      createdAt: true,
      fixedAt: true,
      beforePhotoUrl: true,
      afterPhotoUrl: true,
    },
  })

  // Never expose userId to clients — only a boolean for the owner.
  const data = notices.map(({ userId, ...n }) => ({ ...n, isOwn: !!user && userId === user.sub }))

  return NextResponse.json({ data: { notices: data } })
}

// POST — create a notice (auth + rate limited: 1/day, 3/week per user).
export async function POST(request: NextRequest) {
  const result = await requirePermission(request, 'community', 'create')
  if (isNextResponse(result)) return result

  const isAdmin = result.user.roles.some((r) => BYPASS_ROLES.includes(r))

  if (!isAdmin) {
    const now = Date.now()
    const since = new Date(now - WEEK_MS)
    const recent = await prisma.communityNotice.findMany({
      where: { userId: result.user.sub, createdAt: { gte: since } },
      select: { createdAt: true },
    })
    const inDay = recent.filter((n) => n.createdAt.getTime() > now - DAY_MS).length
    if (inDay >= 1) {
      return NextResponse.json(
        { error: 'Daily limit reached', code: 'RATE_LIMIT_DAILY' },
        { status: 429 }
      )
    }
    if (recent.length >= 3) {
      return NextResponse.json(
        { error: 'Weekly limit reached', code: 'RATE_LIMIT_WEEKLY' },
        { status: 429 }
      )
    }
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'BAD_REQUEST' }, { status: 400 })
  }

  const parsed = createNoticeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation error', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const { category, lat, lng, note, photoKey } = parsed.data
  if (!isValidPhotoKey(photoKey)) {
    return NextResponse.json({ error: 'Invalid photo key', code: 'BAD_REQUEST' }, { status: 400 })
  }
  const photoUrl = getPublicUrl(photoKey)

  const notice = await prisma.communityNotice.create({
    data: { userId: result.user.sub, category, lat, lng, note: note || null, photoUrl },
    select: {
      id: true, category: true, lat: true, lng: true, note: true, photoUrl: true,
      status: true, createdAt: true, fixedAt: true, beforePhotoUrl: true, afterPhotoUrl: true,
    },
  })

  return NextResponse.json({ data: { notice: { ...notice, isOwn: true } } }, { status: 201 })
}
