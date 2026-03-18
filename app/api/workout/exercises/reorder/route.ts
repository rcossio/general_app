import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { reorderExercisesSchema } from '@/modules/workout/lib/schemas'

export async function PATCH(request: NextRequest) {
  const result = await requirePermission(request, 'workout', 'update')
  if (isNextResponse(result)) return result

  try {
    const body = await request.json()
    const parsed = reorderExercisesSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation error", code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { dayId, exerciseIds } = parsed.data

    // Verify ownership
    const day = await prisma.workoutDay.findFirst({
      where: { id: dayId, routine: { userId: result.user.sub } },
      select: { id: true },
    })
    if (!day) {
      return NextResponse.json(
        { error: 'Day not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Update orders in a transaction
    await prisma.$transaction(
      exerciseIds.map((exerciseId, index) =>
        prisma.workoutExercise.update({
          where: { id: exerciseId },
          data: { order: index },
        })
      )
    )

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
