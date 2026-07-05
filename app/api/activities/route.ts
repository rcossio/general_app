import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { parseJson } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { activitySchema } from '@/modules/activities/lib/schemas'

const LIST_LIMIT = 1000

const SELECT = {
  id: true,
  name: true,
  category: true,
  type: true,
  address: true,
  city: true,
  phone: true,
  notes: true,
  website: true,
  facebook: true,
  instagram: true,
  email: true,
  lat: true,
  lng: true,
} as const

// GET — public directory list (no auth). Ordered by name.
export async function GET() {
  const activities = await prisma.activity.findMany({
    orderBy: { name: 'asc' },
    take: LIST_LIMIT,
    select: SELECT,
  })
  return NextResponse.json(
    { data: { activities } },
    { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } }
  )
}

// POST — create an activity (admin only via activities:manage).
export async function POST(request: NextRequest) {
  const result = await requirePermission(request, 'activities', 'manage')
  if (isNextResponse(result)) return result

  const input = await parseJson(request, activitySchema)
  if (isNextResponse(input)) return input

  const { lat, lng, ...rest } = input
  try {
    const activity = await prisma.activity.create({
      data: { ...rest, lat: lat ?? null, lng: lng ?? null },
      select: SELECT,
    })
    return NextResponse.json({ data: { activity } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'An activity with this name already exists', code: 'DUPLICATE_NAME' }, { status: 409 })
  }
}
