import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { closeLocationSchema } from '@/modules/adventure/lib/schemas'
import { evaluate, type Condition } from '@/modules/adventure/lib/condition'

type Params = { params: Promise<{ id: string }> }

type GrantEntry = { flag: string }

type LocationValue = {
  when: Condition
  content: Record<string, string>
  completesChapter?: boolean
  grants?: GrantEntry[]
  revokes?: GrantEntry[]
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
    const parsed = closeLocationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Validation error', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { locationId } = parsed.data

    const session = await prisma.gameSession.findFirst({
      where: { id: sessionId, userId: result.user.sub },
      include: {
        flags: { select: { flag: true } },
        game: { select: { nextGameId: true } },
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const location = await prisma.gameLocation.findFirst({
      where: { id: locationId, gameId: session.gameId },
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const visit = await prisma.locationVisit.findUnique({
      where: { sessionId_locationId: { sessionId, locationId } },
    })

    if (!visit || visit.status !== 'open') {
      return NextResponse.json(
        { error: 'Location is not open', code: 'NOT_OPEN' },
        { status: 400 }
      )
    }

    const flagSet = new Set(session.flags.map((f) => f.flag))
    const values = location.values as LocationValue[]
    const activeValue = resolveActiveValue(values, flagSet)

    // Grants: location-level (unconditional) + active value-level (conditional)
    const locationGrants = (location.grants as GrantEntry[]) ?? []
    const valueGrants = activeValue?.grants ?? []
    const newFlags = [...locationGrants, ...valueGrants]
      .map((g) => g.flag)
      .filter((f) => !flagSet.has(f))

    // Revokes: active value-level only (applied last so they can remove callback flags)
    const revokedFlags = (activeValue?.revokes ?? []).map((r) => r.flag)

    const completesChapter = activeValue?.completesChapter ?? false

    await prisma.$transaction(async (tx) => {
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

      if (completesChapter && !session.completedAt) {
        await tx.gameSession.update({
          where: { id: sessionId },
          data: { completedAt: new Date() },
        })
      }

      await tx.locationVisit.update({
        where: { id: visit.id },
        data: { status: 'closed' },
      })
    })

    return NextResponse.json({
      data: {
        closed: true,
        newFlags,
        revokedFlags,
        completesChapter,
        nextGameId: completesChapter ? (session.game.nextGameId ?? null) : null,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
