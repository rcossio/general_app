import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { createRoutineSchema, paginationSchema } from '@/modules/workout/lib/schemas'

export async function GET(request: NextRequest) {
  const result = await requirePermission(request, 'workout', 'read')
  if (isNextResponse(result)) return result

  const { searchParams } = new URL(request.url)
  const pagination = paginationSchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })
  if (!pagination.success) {
    return NextResponse.json(
      { error: pagination.error.issues[0]?.message ?? "Validation error", code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const { page, limit } = pagination.data
  const skip = (page - 1) * limit

  const [routines, total] = await Promise.all([
    prisma.workoutRoutine.findMany({
      where: { userId: result.user.sub },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { days: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.workoutRoutine.count({ where: { userId: result.user.sub } }),
  ])

  return NextResponse.json({ data: { routines, total, page, limit } })
}

export async function POST(request: NextRequest) {
  const result = await requirePermission(request, 'workout', 'create')
  if (isNextResponse(result)) return result

  try {
    const body = await request.json()
    const parsed = createRoutineSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation error", code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const routine = await prisma.workoutRoutine.create({
      data: { ...parsed.data, userId: result.user.sub },
      select: { id: true, name: true, description: true, createdAt: true, updatedAt: true },
    })

    return NextResponse.json({ data: routine }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
