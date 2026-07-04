import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { parseJson } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { associationSchema } from '@/modules/associations/lib/schemas'

const LIST_LIMIT = 1000

// Fields returned to clients — the full directory entry minus internal timestamps.
const SELECT = {
  id: true,
  name: true,
  description: true,
  official: true,
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

  const input = await parseJson(request, associationSchema)
  if (isNextResponse(input)) return input

  const { lat, lng, ...rest } = input
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
