import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { updateRoutineSchema } from '@/modules/workout/lib/schemas'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'workout', 'read')
  if (isNextResponse(result)) return result

  const { id } = await params
  const routine = await prisma.workoutRoutine.findFirst({
    where: { id, userId: result.user.sub },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      days: {
        select: {
          id: true,
          dayOfWeek: true,
          name: true,
          exercises: {
            select: {
              id: true, name: true, sets: true, reps: true,
              durationSeconds: true, restSeconds: true, notes: true, order: true,
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { dayOfWeek: 'asc' },
      },
    },
  })

  if (!routine) {
    return NextResponse.json(
      { error: 'Routine not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  return NextResponse.json({ data: routine })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'workout', 'update')
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
    const parsed = updateRoutineSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation error", code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const updated = await prisma.workoutRoutine.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true, description: true, updatedAt: true },
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
  const routine = await prisma.workoutRoutine.findUnique({
    where: { id },
    select: { userId: true },
  })
  if (!routine) {
    return NextResponse.json(
      { error: 'Routine not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  const isOwner = routine.userId === result.user.sub
  const canDeleteAny = result.user.roles.some((r) => ['master_admin', 'admin'].includes(r))
  if (!isOwner && !canDeleteAny) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'PERMISSION_DENIED' },
      { status: 403 }
    )
  }

  await prisma.workoutRoutine.delete({ where: { id } })
  return NextResponse.json({ data: { success: true } })
}
