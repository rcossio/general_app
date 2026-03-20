import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { visitLocationSchema } from '@/modules/adventure/lib/schemas'
import { evaluate, type Condition } from '@/modules/adventure/lib/condition'
import { distanceMeters } from '@/modules/adventure/lib/haversine'

type Params = { params: Promise<{ id: string }> }

type LocationValue = {
  when: Condition
  content: Record<string, string>
  completesChapter?: boolean
}

type GrantEntry = { flag: string }

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

export async function POST(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'adventure', 'play')
  if (isNextResponse(result)) return result

  const { id: sessionId } = await params

  try {
    const body = await request.json()
    const parsed = visitLocationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Validation error', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { locationId, lat, lng } = parsed.data

    // Load session with flags and visits
    const session = await prisma.gameSession.findFirst({
      where: { id: sessionId, userId: result.user.sub },
      include: {
        flags: { select: { flag: true } },
        visits: { select: { locationId: true } },
        game: { select: { nextGameId: true } },
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (session.completedAt) {
      return NextResponse.json(
        { error: 'Session already completed', code: 'SESSION_COMPLETE' },
        { status: 400 }
      )
    }

    // Load the target location
    const location = await prisma.gameLocation.findFirst({
      where: { id: locationId, gameId: session.gameId },
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const flagSet = new Set(session.flags.map((f) => f.flag))
    const visitedIds = new Set(session.visits.map((v) => v.locationId))

    // Check visibility gate
    if (!evaluate(location.visibleWhen as Condition, flagSet)) {
      return NextResponse.json(
        { error: 'Location not yet accessible', code: 'NOT_ACCESSIBLE' },
        { status: 403 }
      )
    }

    // GPS distance check
    const dist = distanceMeters(lat, lng, location.lat, location.lng)
    if (dist > location.radiusM) {
      return NextResponse.json(
        {
          error: `You are ${Math.round(dist)}m away. Must be within ${location.radiusM}m.`,
          code: 'TOO_FAR',
          distance: Math.round(dist),
          radiusM: location.radiusM,
        },
        { status: 400 }
      )
    }

    const alreadyVisited = visitedIds.has(locationId)

    // Evaluate narrative BEFORE grants (first-visit narrative should show pre-grant state)
    const values = location.values as LocationValue[]
    const { content: narrative, completesChapter } = resolveNarrative(values, flagSet)

    if (!alreadyVisited) {
      // Apply grants and record visit in a transaction
      const grants = (location.grants as GrantEntry[]) ?? []
      const newFlags = grants.map((g) => g.flag).filter((f) => !flagSet.has(f))

      await prisma.$transaction(async (tx) => {
        await tx.locationVisit.create({ data: { sessionId, locationId } })

        for (const flag of newFlags) {
          await tx.sessionFlag.upsert({
            where: { sessionId_flag: { sessionId, flag } },
            update: {},
            create: { sessionId, flag },
          })
        }

        if (completesChapter) {
          await tx.gameSession.update({
            where: { id: sessionId },
            data: { completedAt: new Date() },
          })
        }
      })

      return NextResponse.json({
        data: {
          narrative,
          newFlags,
          completesChapter,
          alreadyVisited: false,
          nextGameId: completesChapter ? (session.game.nextGameId ?? null) : null,
        },
      })
    }

    // Revisit: return updated narrative (flags have accumulated since first visit)
    return NextResponse.json({
      data: {
        narrative,
        newFlags: [],
        completesChapter: false,
        alreadyVisited: true,
        nextGameId: null,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
