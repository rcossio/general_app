import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { evaluate, type Condition } from '@/modules/adventure/lib/condition'
import { resolveNarrative, resolveValueIndex, type LocationValue } from '@/modules/adventure/lib/narrative'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'adventure', 'play')
  if (isNextResponse(result)) return result

  const { id } = await params

  // Allow access if user is owner or spectator participant
  const session = await prisma.gameSession.findFirst({
    where: {
      id,
      OR: [
        { userId: result.user.sub },
        { participants: { some: { userId: result.user.sub } } },
      ],
    },
    include: {
      game: {
        select: {
          id: true,
          title: true,
          chapter: true,
          nextGameId: true,
          items: true,
          locations: {
            orderBy: { order: 'asc' },
            // Only the fields this handler reads — avoids re-fetching grants/
            // revokes and other columns on every (10s) spectator poll.
            select: {
              id: true,
              externalId: true,
              name: true,
              lat: true,
              lng: true,
              radiusM: true,
              type: true,
              imageUrl: true,
              visibleWhen: true,
              values: true,
              initialLocation: true,
            },
          },
        },
      },
      flags: { select: { flag: true } },
      visits: { select: { locationId: true, status: true, seenValueIndex: true } },
    },
  })

  if (!session) {
    return NextResponse.json(
      { error: 'Session not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  const isSpectator = session.userId !== result.user.sub

  const flagSet = new Set(session.flags.map((f) => f.flag))
  const visitedIds = new Set(session.visits.map((v) => v.locationId))
  const visitStatusMap = new Map(session.visits.map((v) => [v.locationId, v.status]))
  const seenValueMap = new Map(session.visits.map((v) => [v.locationId, v.seenValueIndex]))

  const locations = session.game.locations.map((loc) => {
    const visible =
      evaluate(loc.visibleWhen as Condition, flagSet)
    const visited = visitedIds.has(loc.id)
    const status = visitStatusMap.get(loc.id) ?? null
    const values = loc.values as LocationValue[]
    const { content: narrative, choices, hasPassword, imageUrl: valueImageUrl } = visible
      ? resolveNarrative(values, flagSet)
      : { content: null, choices: null, hasPassword: false, imageUrl: null }

    // A closed location whose resolved value now differs from the one the player
    // last saw has "new state" — the marker should re-brighten to the unvisited color.
    const seenValueIndex = seenValueMap.get(loc.id) ?? null
    const hasUpdate =
      visible &&
      visited &&
      status === 'closed' &&
      seenValueIndex !== null &&
      resolveValueIndex(values, flagSet) !== seenValueIndex

    return {
      id: loc.id,
      externalId: loc.externalId,
      name: loc.name as Record<string, string>,
      lat: loc.lat,
      lng: loc.lng,
      radiusM: loc.radiusM,
      type: loc.type,
      imageUrl: valueImageUrl ?? loc.imageUrl ?? null,
      visible,
      visited,
      status,
      hasUpdate,
      narrative: narrative ?? null,
      // Show choices when status is not 'closed' (interaction still open)
      choices: status === 'closed' ? null : (choices ?? null),
      hasPassword,
      initialLocation: loc.initialLocation,
    }
  })

  const data = {
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
      title: session.game.title,
      chapter: session.game.chapter,
      nextGameId: session.game.nextGameId,
      items: session.game.items,
    },
    locations,
    isSpectator,
  }

  // Versioned response: hash the fully-resolved payload. Spectators poll this
  // every 10s and the state is usually unchanged, so we let the client send the
  // last version (X-Session-Version) and return 304 when it matches — skipping
  // the (large, multilingual JSONB) body, its transfer, and the client re-render.
  // A custom header is used instead of ETag to avoid Nginx's gzip/ETag handling.
  // (The DB read still happens; eliminating it would need a version column or SSE.)
  const version = createHash('sha1').update(JSON.stringify(data)).digest('hex')
  if (request.headers.get('x-session-version') === version) {
    return new NextResponse(null, { status: 304, headers: { 'X-Session-Version': version } })
  }

  return NextResponse.json({ data }, { headers: { 'X-Session-Version': version } })
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
