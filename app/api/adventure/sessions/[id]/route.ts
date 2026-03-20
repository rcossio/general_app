import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { evaluate, type Condition } from '@/modules/adventure/lib/condition'
import type { Prisma } from '@prisma/client'

type Params = { params: Promise<{ id: string }> }

type LocationValue = {
  when: Condition
  content: Record<string, string>
  completesChapter?: boolean
}

function resolveNarrative(
  values: LocationValue[],
  flags: Set<string>
): { content: Record<string, string>; completesChapter: boolean } {
  for (const v of values) {
    if (evaluate(v.when as Condition, flags)) {
      return { content: v.content, completesChapter: v.completesChapter ?? false }
    }
  }
  return { content: {}, completesChapter: false }
}

export async function GET(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'adventure', 'play')
  if (isNextResponse(result)) return result

  const { id } = await params

  const session = await prisma.gameSession.findFirst({
    where: { id, userId: result.user.sub },
    include: {
      game: {
        select: {
          id: true,
          slug: true,
          title: true,
          chapter: true,
          nextGameId: true,
          locations: {
            orderBy: { order: 'asc' },
          },
        },
      },
      flags: { select: { flag: true } },
      visits: { select: { locationId: true } },
    },
  })

  if (!session) {
    return NextResponse.json(
      { error: 'Session not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  const flagSet = new Set(session.flags.map((f) => f.flag))
  const visitedIds = new Set(session.visits.map((v) => v.locationId))

  const locations = session.game.locations.map((loc) => {
    const visible =
      evaluate(loc.visibleWhen as Condition, flagSet)
    const visited = visitedIds.has(loc.id)
    const values = loc.values as LocationValue[]
    const { content: narrative } = visible
      ? resolveNarrative(values, flagSet)
      : { content: null }

    return {
      id: loc.id,
      externalId: loc.externalId,
      name: loc.name as Record<string, string>,
      lat: loc.lat,
      lng: loc.lng,
      radiusM: loc.radiusM,
      visible,
      visited,
      narrative: narrative ?? null,
    }
  })

  return NextResponse.json({
    data: {
      session: {
        id: session.id,
        gameId: session.gameId,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        flags: Array.from(flagSet),
        visitedLocationIds: Array.from(visitedIds),
      },
      game: {
        id: session.game.id,
        slug: session.game.slug,
        title: session.game.title,
        chapter: session.game.chapter,
        nextGameId: session.game.nextGameId,
      },
      locations,
    },
  })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'adventure', 'play')
  if (isNextResponse(result)) return result

  const { id } = await params

  const session = await prisma.gameSession.findFirst({
    where: { id, userId: result.user.sub },
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  await prisma.gameSession.delete({ where: { id } })

  return NextResponse.json({ data: { deleted: true } })
}
