import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { closeLocationSchema } from '@/modules/adventure/lib/schemas'
import { evaluate, type Condition } from '@/modules/adventure/lib/condition'

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

function resolveNarrative(
  values: LocationValue[],
  flags: Set<string>
): { content: Record<string, string>; completesChapter: boolean; choices: { id: string; label: Record<string, string> }[] | null; hasPassword: boolean; imageUrl: string | null } {
  for (const v of values) {
    if (evaluate(v.when as Condition, flags)) {
      return {
        content: v.content,
        completesChapter: v.completesChapter ?? false,
        choices: v.choices?.map((c) => ({ id: c.id, label: c.label })) ?? null,
        hasPassword: !!v.password,
        imageUrl: v.imageUrl ?? null,
      }
    }
  }
  return { content: {}, completesChapter: false, choices: null, hasPassword: false, imageUrl: null }
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
        game: {
          select: {
            nextGameId: true,
            locations: {
              select: { id: true, visibleWhen: true, values: true, imageUrl: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const location = session.game.locations.find((l) => l.id === locationId)

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const fullLocation = await prisma.gameLocation.findFirst({
      where: { id: locationId, gameId: session.gameId },
    })

    if (!fullLocation) {
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

    const oldFlagSet = new Set(session.flags.map((f) => f.flag))
    const values = fullLocation.values as LocationValue[]
    const activeValue = resolveActiveValue(values, oldFlagSet)

    // Grants: location-level (unconditional) + active value-level (conditional)
    const locationGrants = (fullLocation.grants as GrantEntry[]) ?? []
    const valueGrants = activeValue?.grants ?? []
    const newFlags = [...locationGrants, ...valueGrants]
      .map((g) => g.flag)
      .filter((f) => !oldFlagSet.has(f))

    // Revokes: location-level (unconditional) + active value-level (applied last so they can remove callback flags)
    const locationRevokes = (fullLocation.revokes as GrantEntry[]) ?? []
    const valueRevokes = activeValue?.revokes ?? []
    const revokedFlags = [...locationRevokes, ...valueRevokes].map((r) => r.flag)

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

    // Compute the new flag set after grants/revokes
    const newFlagSet = new Set(oldFlagSet)
    for (const f of newFlags) newFlagSet.add(f)
    for (const f of revokedFlags) newFlagSet.delete(f)

    const flagsChanged = newFlags.length > 0 || revokedFlags.length > 0

    // Compute visibility and narrative diffs for all OTHER locations
    // (the closed location itself is handled by the client: status→closed, choices→null)
    const locationUpdates: Array<{
      id: string
      visible: boolean
      narrative: Record<string, string> | null
      choices: { id: string; label: Record<string, string> }[] | null
      hasPassword: boolean
      imageUrl: string | null
    }> = []

    if (flagsChanged) {
      for (const loc of session.game.locations) {
        if (loc.id === locationId) continue
        const wasBefore = evaluate(loc.visibleWhen as Condition, oldFlagSet)
        const isNow = evaluate(loc.visibleWhen as Condition, newFlagSet)
        const locValues = loc.values as LocationValue[]

        if (wasBefore !== isNow) {
          // Visibility changed — send full resolved state
          const resolved = isNow
            ? resolveNarrative(locValues, newFlagSet)
            : { content: null, choices: null, hasPassword: false, imageUrl: null }
          locationUpdates.push({
            id: loc.id,
            visible: isNow,
            narrative: resolved.content,
            choices: resolved.choices,
            hasPassword: resolved.hasPassword,
            imageUrl: resolved.imageUrl ?? (loc.imageUrl as string | null),
          })
        } else if (wasBefore && isNow) {
          // Still visible — check if narrative changed due to new flags
          const oldResolved = resolveNarrative(locValues, oldFlagSet)
          const newResolved = resolveNarrative(locValues, newFlagSet)
          const narrativeChanged =
            JSON.stringify(oldResolved.content) !== JSON.stringify(newResolved.content) ||
            JSON.stringify(oldResolved.choices) !== JSON.stringify(newResolved.choices) ||
            oldResolved.hasPassword !== newResolved.hasPassword ||
            oldResolved.imageUrl !== newResolved.imageUrl
          if (narrativeChanged) {
            locationUpdates.push({
              id: loc.id,
              visible: true,
              narrative: newResolved.content,
              choices: newResolved.choices,
              hasPassword: newResolved.hasPassword,
              imageUrl: newResolved.imageUrl ?? (loc.imageUrl as string | null),
            })
          }
        }
      }
    }

    return NextResponse.json({
      data: {
        closed: true,
        newFlags,
        revokedFlags,
        completesChapter,
        nextGameId: completesChapter ? (session.game.nextGameId ?? null) : null,
        locationUpdates,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
