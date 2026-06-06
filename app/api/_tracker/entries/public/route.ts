import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { publicFeedSchema } from '@/modules/life-tracker/lib/schemas'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parsed = publicFeedSchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    type: searchParams.get('type') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation error', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const { page, limit, type } = parsed.data
  const skip = (page - 1) * limit

  const [entries, total] = await Promise.all([
    prisma.trackerEntry.findMany({
      where: { isPublic: true, ...(type ? { type } : {}) },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        score: true,
        tags: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.trackerEntry.count({ where: { isPublic: true, ...(type ? { type } : {}) } }),
  ])

  return NextResponse.json({ data: { entries, total, page, limit } })
}
