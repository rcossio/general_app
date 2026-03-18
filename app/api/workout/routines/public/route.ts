import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { publicFeedSchema } from '@/modules/workout/lib/schemas'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parsed = publicFeedSchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation error', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const { page, limit } = parsed.data
  const skip = (page - 1) * limit

  const [routines, total] = await Promise.all([
    prisma.workoutRoutine.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: { select: { days: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.workoutRoutine.count({ where: { isPublic: true } }),
  ])

  return NextResponse.json({ data: { routines, total, page, limit } })
}
