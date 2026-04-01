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

type PasswordData = {
  value: string
  grants: GrantEntry[]
}

type LocationValue = {
  when: Condition
  content: Record<string, string>
  completesChapter?: boolean
  choices?: Choice[]
  password?: PasswordData
  grants?: GrantEntry[]
  revokes?: GrantEntry[]
  imageUrl?: string | null
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

    const { locationId, lat, lng, choiceId, password } = parsed.data

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

    // Check current visit status
    const existingVisit = alreadyVisited
      ? await prisma.locationVisit.findUnique({
          where: { sessionId_locationId: { sessionId, locationId } },
        })
      : null
    const currentStatus = existingVisit?.status ?? null

    // Resolve the active value entry (evaluated before grants, so pre-visit flag state)
    const values = location.values as LocationValue[]
    const activeValue = resolveActiveValue(values, flagSet)
    if (!activeValue) {
      return NextResponse.json(
        { error: 'No narrative available', code: 'NO_NARRATIVE' },
        { status: 400 }
      )
    }

    // Resolve the chosen option (if any)
    let chosenOption: Choice | null = null
    if (choiceId) {
      chosenOption = activeValue.choices?.find((c) => c.id === choiceId) ?? null
      if (!chosenOption) {
        return NextResponse.json(
          { error: 'Invalid choice', code: 'INVALID_CHOICE' },
          { status: 400 }
        )
      }
    }

    // --- Password mechanic (only when player actually submits a password) ---
    let passwordGrants: string[] = []
    if (activeValue.password && password !== undefined) {
      const pwData = activeValue.password
      const correct = password === pwData.value

      if (!correct) {
        // Mark as visited on first wrong attempt so the player can retry via map tap
        if (!alreadyVisited) {
          await prisma.locationVisit.create({ data: { sessionId, locationId, status: 'open' } })
        } else if (currentStatus === 'closed') {
          await prisma.locationVisit.update({
            where: { id: existingVisit!.id },
            data: { status: 'open' },
          })
        }
        return NextResponse.json({
          data: {
            narrative: activeValue.content,
            imageUrl: activeValue.imageUrl ?? location.imageUrl ?? null,
            newFlags: [],
            revokedFlags: [],
            completesChapter: false,
            alreadyVisited,
            nextGameId: null,
            passwordWrong: true,
            shouldRefresh: true,
          },
        })
      }

      // Correct password — collect callback flags, then fall through to normal visit
      passwordGrants = (pwData.grants ?? []).map((g) => g.flag).filter((f) => !flagSet.has(f))
    }
    // --- End password mechanic ---

    // Grant callback flags from choices or password — all other grants happen at close time
    const choiceGrants = chosenOption?.grants ?? []
    const newFlags = [
      ...choiceGrants.map((g) => g.flag).filter((f) => !flagSet.has(f)),
      ...passwordGrants,
    ]

    await prisma.$transaction(async (tx) => {
      // Visit record: first visit creates with status 'open', re-visit from 'closed' reopens
      if (!alreadyVisited) {
        await tx.locationVisit.create({ data: { sessionId, locationId, status: 'open' } })
      } else if (currentStatus === 'closed') {
        await tx.locationVisit.update({
          where: { id: existingVisit!.id },
          data: { status: 'open' },
        })
      }

      for (const flag of newFlags) {
        await tx.sessionFlag.upsert({
          where: { sessionId_flag: { sessionId, flag } },
          update: {},
          create: { sessionId, flag },
        })
      }
    })

    return NextResponse.json({
      data: {
        imageUrl: activeValue.imageUrl ?? location.imageUrl ?? null,
        newFlags,
        alreadyVisited,
        shouldRefresh: true,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
