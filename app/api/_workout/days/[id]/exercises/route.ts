import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { createExerciseSchema } from '@/modules/workout/lib/schemas'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'workout', 'create')
  if (isNextResponse(result)) return result

  const { id } = await params
  const day = await prisma.workoutDay.findFirst({
    where: { id, routine: { userId: result.user.sub } },
    select: { id: true },
  })
  if (!day) {
    return NextResponse.json(
      { error: 'Day not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  try {
    const body = await request.json()
    const parsed = createExerciseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation error", code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const exercise = await prisma.workoutExercise.create({
      data: { ...parsed.data, dayId: id },
      select: {
        id: true, name: true, sets: true, reps: true,
        durationSeconds: true, restSeconds: true, notes: true, order: true,
      },
    })
    return NextResponse.json({ data: exercise }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
