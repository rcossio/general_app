import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { startSessionSchema } from '@/modules/adventure/lib/schemas'

export async function POST(request: NextRequest) {
  const result = await requirePermission(request, 'adventure', 'play')
  if (isNextResponse(result)) return result

  try {
    const body = await request.json()
    const parsed = startSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Validation error', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { gameId } = parsed.data

    const game = await prisma.game.findFirst({
      where: { id: gameId, isActive: true },
      select: { id: true },
    })
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Atomic upsert: avoids race condition if two requests arrive simultaneously
    const session = await prisma.gameSession.upsert({
      where: { gameId_userId: { gameId, userId: result.user.sub } },
      update: {},
      create: { gameId, userId: result.user.sub },
      select: { id: true },
    })

    return NextResponse.json({ data: { sessionId: session.id } })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
