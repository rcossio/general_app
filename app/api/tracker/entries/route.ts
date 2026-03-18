import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { createEntrySchema, listEntriesSchema } from '@/modules/life-tracker/lib/schemas'

export async function GET(request: NextRequest) {
  const result = await requirePermission(request, 'tracker', 'read')
  if (isNextResponse(result)) return result

  const { searchParams } = new URL(request.url)
  const parsed = listEntriesSchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    type: searchParams.get('type') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation error", code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const { page, limit, type } = parsed.data
  const skip = (page - 1) * limit
  const where = { userId: result.user.sub, ...(type ? { type } : {}) }

  const [entries, total] = await Promise.all([
    prisma.trackerEntry.findMany({
      where,
      select: {
        id: true, type: true, title: true, content: true,
        score: true, tags: true, isPublic: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.trackerEntry.count({ where }),
  ])

  return NextResponse.json({ data: { entries, total, page, limit } })
}

export async function POST(request: NextRequest) {
  const result = await requirePermission(request, 'tracker', 'create')
  if (isNextResponse(result)) return result

  try {
    const body = await request.json()
    const parsed = createEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation error", code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const entry = await prisma.trackerEntry.create({
      data: { ...parsed.data, userId: result.user.sub },
      select: {
        id: true, type: true, title: true, content: true,
        score: true, tags: true, isPublic: true, createdAt: true,
      },
    })
    return NextResponse.json({ data: entry }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
