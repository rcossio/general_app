import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { joinSessionSchema } from '@/modules/adventure/lib/schemas'

// POST — join a session as spectator using a join code
export async function POST(request: NextRequest) {
  const result = await requirePermission(request, 'adventure', 'play')
  if (isNextResponse(result)) return result

  try {
    const body = await request.json()
    const parsed = joinSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Validation error', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { joinCode } = parsed.data

    const session = await prisma.gameSession.findFirst({
      where: { joinCode: joinCode.toUpperCase() },
      select: { id: true, userId: true },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid join code', code: 'INVALID_CODE' },
        { status: 404 }
      )
    }

    // Owner cannot join their own session as spectator
    if (session.userId === result.user.sub) {
      return NextResponse.json({ data: { sessionId: session.id } })
    }

    // Upsert participant
    await prisma.sessionParticipant.upsert({
      where: {
        sessionId_userId: { sessionId: session.id, userId: result.user.sub },
      },
      update: {},
      create: { sessionId: session.id, userId: result.user.sub },
    })

    return NextResponse.json({ data: { sessionId: session.id } })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
