import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { updateDaySchema } from '@/modules/workout/lib/schemas'

type Params = { params: Promise<{ id: string }> }

async function getDayAndVerifyOwner(dayId: string, userId: string) {
  return prisma.workoutDay.findFirst({
    where: {
      id: dayId,
      routine: { userId },
    },
    select: { id: true },
  })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'workout', 'update')
  if (isNextResponse(result)) return result

  const { id } = await params
  const day = await getDayAndVerifyOwner(id, result.user.sub)
  if (!day) {
    return NextResponse.json(
      { error: 'Day not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  try {
    const body = await request.json()
    const parsed = updateDaySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation error", code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const updated = await prisma.workoutDay.update({
      where: { id },
      data: parsed.data,
      select: { id: true, dayOfWeek: true, name: true },
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
  const day = await getDayAndVerifyOwner(id, result.user.sub)
  if (!day) {
    return NextResponse.json(
      { error: 'Day not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  await prisma.workoutDay.delete({ where: { id } })
  return NextResponse.json({ data: { success: true } })
}
