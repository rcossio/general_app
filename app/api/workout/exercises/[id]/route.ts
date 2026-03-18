import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { updateExerciseSchema } from '@/modules/workout/lib/schemas'

type Params = { params: Promise<{ id: string }> }

async function getExerciseAndVerifyOwner(exerciseId: string, userId: string) {
  return prisma.workoutExercise.findFirst({
    where: {
      id: exerciseId,
      day: { routine: { userId } },
    },
    select: { id: true },
  })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'workout', 'update')
  if (isNextResponse(result)) return result

  const { id } = await params
  const exercise = await getExerciseAndVerifyOwner(id, result.user.sub)
  if (!exercise) {
    return NextResponse.json(
      { error: 'Exercise not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  try {
    const body = await request.json()
    const parsed = updateExerciseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation error", code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const updated = await prisma.workoutExercise.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true, name: true, sets: true, reps: true,
        durationSeconds: true, restSeconds: true, notes: true, order: true,
      },
    })
    return NextResponse.json({ data: updated })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'workout', 'delete')
  if (isNextResponse(result)) return result

  const { id } = await params
  const exercise = await getExerciseAndVerifyOwner(id, result.user.sub)
  if (!exercise) {
    return NextResponse.json(
      { error: 'Exercise not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  await prisma.workoutExercise.delete({ where: { id } })
  return NextResponse.json({ data: { success: true } })
}
