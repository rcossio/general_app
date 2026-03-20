import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { createGameSchema } from '@/modules/adventure/lib/schemas'

export async function GET(request: NextRequest) {
  const result = await requirePermission(request, 'adventure', 'play')
  if (isNextResponse(result)) return result

  const games = await prisma.game.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      chapter: true,
      nextGameId: true,
      createdAt: true,
    },
    orderBy: [{ chapter: 'asc' }, { createdAt: 'asc' }],
  })

  // Attach current user's session status to each game
  const sessionMap = await prisma.gameSession.findMany({
    where: {
      userId: result.user.sub,
      gameId: { in: games.map((g) => g.id) },
    },
    select: {
      gameId: true,
      id: true,
      startedAt: true,
      completedAt: true,
    },
  })

  const sessionByGame = Object.fromEntries(sessionMap.map((s) => [s.gameId, s]))

  return NextResponse.json({
    data: games.map((g) => ({
      ...g,
      session: sessionByGame[g.id] ?? null,
    })),
  })
}

export async function POST(request: NextRequest) {
  const result = await requirePermission(request, 'adventure', 'manage')
  if (isNextResponse(result)) return result

  try {
    const body = await request.json()
    const parsed = createGameSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Validation error', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { slug, title, description, chapter, nextGameSlug } = parsed.data

    let nextGameId: string | undefined
    if (nextGameSlug) {
      const nextGame = await prisma.game.findUnique({ where: { slug: nextGameSlug } })
      if (!nextGame) {
        return NextResponse.json(
          { error: 'nextGameSlug not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }
      nextGameId = nextGame.id
    }

    const game = await prisma.game.create({
      data: { slug, title, description, chapter, nextGameId },
      select: { id: true, slug: true, title: true, chapter: true, isActive: true },
    })

    return NextResponse.json({ data: game }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
