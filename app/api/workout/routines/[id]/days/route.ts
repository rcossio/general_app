import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { createDaySchema } from '@/modules/workout/lib/schemas'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'workout', 'create')
  if (isNextResponse(result)) return result

  const { id } = await params
  const routine = await prisma.workoutRoutine.findFirst({
    where: { id, userId: result.user.sub },
    select: { id: true },
  })
  if (!routine) {
    return NextResponse.json(
      { error: 'Routine not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  try {
    const body = await request.json()
    const parsed = createDaySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation error", code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const day = await prisma.workoutDay.create({
      data: { ...parsed.data, routineId: id },
      select: { id: true, dayOfWeek: true, name: true },
    })
    return NextResponse.json({ data: day }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
