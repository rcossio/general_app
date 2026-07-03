import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { associationSchema } from '@/modules/associations/lib/schemas'

const LIST_LIMIT = 1000

// Fields returned to clients — the full directory entry minus internal timestamps.
const SELECT = {
  id: true,
  name: true,
  description: true,
  website: true,
  facebook: true,
  instagram: true,
  email: true,
  phone: true,
  address: true,
  lat: true,
  lng: true,
} as const

// GET — public directory list (no auth required). Ordered alphabetically.
export async function GET() {
  const associations = await prisma.association.findMany({
    orderBy: { name: 'asc' },
    take: LIST_LIMIT,
    select: SELECT,
  })

  // Identical for everyone and changes rarely, so let browsers/shared caches
  // reuse it briefly.
  return NextResponse.json(
    { data: { associations } },
    { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } }
  )
}

// POST — create an association (admin only via associations:manage).
export async function POST(request: NextRequest) {
  const result = await requirePermission(request, 'associations', 'manage')
  if (isNextResponse(result)) return result

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'BAD_REQUEST' }, { status: 400 })
  }

  const parsed = associationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation error', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const { lat, lng, ...rest } = parsed.data
  try {
    const association = await prisma.association.create({
      data: { ...rest, lat: lat ?? null, lng: lng ?? null },
      select: SELECT,
    })
    return NextResponse.json({ data: { association } }, { status: 201 })
  } catch {
    // Unique constraint on `name`.
    return NextResponse.json(
      { error: 'An association with this name already exists', code: 'DUPLICATE_NAME' },
      { status: 409 }
    )
  }
}
