import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { visitLocationSchema } from '@/modules/adventure/lib/schemas'
import { evaluate, type Condition } from '@/modules/adventure/lib/condition'
import { distanceMeters } from '@/modules/adventure/lib/haversine'

type Params = { params: Promise<{ id: string }> }

type GrantEntry = { flag: string }

type Choice = {
  id: string
  label: Record<string, string>
  outcome: Record<string, string>
  grants: GrantEntry[]
}

type LocationValue = {
  when: Condition
  content: Record<string, string>
  completesChapter?: boolean
  choices?: Choice[]
  unvisits?: string[]  // external IDs of locations to unvisit when this value fires
}

function resolveActiveValue(
  values: LocationValue[],
  flags: Set<string>
): LocationValue | null {
  for (const v of values) {
    if (evaluate(v.when as Condition, flags)) return v
  }
  return null
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

    const { locationId, lat, lng, choiceId } = parsed.data

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

    // Resolve the active value entry (evaluated before grants, so pre-visit flag state)
    const values = location.values as LocationValue[]
    const activeValue = resolveActiveValue(values, flagSet)
    if (!activeValue) {
      return NextResponse.json(
        { error: 'No narrative available', code: 'NO_NARRATIVE' },
        { status: 400 }
      )
    }

    const hasChoices = !alreadyVisited && (activeValue.choices?.length ?? 0) > 0

    // If this value offers choices, a choiceId is required
    if (hasChoices && !choiceId) {
      return NextResponse.json(
        { error: 'A choice is required to visit this location', code: 'CHOICE_REQUIRED' },
        { status: 400 }
      )
    }

    // Resolve the chosen option (if any)
    let chosenOption: Choice | null = null
    if (hasChoices && choiceId) {
      chosenOption = activeValue.choices!.find((c) => c.id === choiceId) ?? null
      if (!chosenOption) {
        return NextResponse.json(
          { error: 'Invalid choice', code: 'INVALID_CHOICE' },
          { status: 400 }
        )
      }
    }

    const narrative = chosenOption ? chosenOption.outcome : activeValue.content
    const completesChapter = activeValue.completesChapter ?? false

    if (!alreadyVisited) {
      // Location-level grants (unconditional) + choice-level grants
      const locationGrants = (location.grants as GrantEntry[]) ?? []
      const choiceGrants = chosenOption?.grants ?? []
      const allGrants = [...locationGrants, ...choiceGrants]
      const newFlags = allGrants.map((g) => g.flag).filter((f) => !flagSet.has(f))

      const revokedFlags = ((location.revokes as GrantEntry[]) ?? []).map((r) => r.flag)
      const unvisitExternalIds = activeValue.unvisits ?? []

      await prisma.$transaction(async (tx) => {
        await tx.locationVisit.create({ data: { sessionId, locationId } })

        for (const flag of newFlags) {
          await tx.sessionFlag.upsert({
            where: { sessionId_flag: { sessionId, flag } },
            update: {},
            create: { sessionId, flag },
          })
        }

        if (revokedFlags.length > 0) {
          await tx.sessionFlag.deleteMany({
            where: { sessionId, flag: { in: revokedFlags } },
          })
        }

        if (unvisitExternalIds.length > 0) {
          const locsToUnvisit = await tx.gameLocation.findMany({
            where: { gameId: session.gameId, externalId: { in: unvisitExternalIds } },
            select: { id: true },
          })
          const locIdsToUnvisit = locsToUnvisit.map((l) => l.id)
          if (locIdsToUnvisit.length > 0) {
            await tx.locationVisit.deleteMany({
              where: { sessionId, locationId: { in: locIdsToUnvisit } },
            })
          }
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
          revokedFlags,
          completesChapter,
          alreadyVisited: false,
          nextGameId: completesChapter ? (session.game.nextGameId ?? null) : null,
        },
      })
    }

    // Revisit: return updated narrative (flags have accumulated since first visit)
    return NextResponse.json({
      data: {
        narrative: activeValue.content,
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
