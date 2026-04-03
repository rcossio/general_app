import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no ambiguous chars (0/O, 1/I/L)
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// POST — generate or return existing join code (owner only)
export async function POST(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'adventure', 'play')
  if (isNextResponse(result)) return result

  const { id: sessionId } = await params

  const session = await prisma.gameSession.findFirst({
    where: { id: sessionId, userId: result.user.sub },
    select: { id: true, joinCode: true },
  })

  if (!session) {
    return NextResponse.json(
      { error: 'Session not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  if (session.joinCode) {
    return NextResponse.json({ data: { joinCode: session.joinCode } })
  }

  // Generate a unique join code (retry on collision)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateJoinCode()
    try {
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { joinCode: code },
      })
      return NextResponse.json({ data: { joinCode: code } }, { status: 201 })
    } catch {
      // unique constraint violation — retry with a different code
      continue
    }
  }

  return NextResponse.json(
    { error: 'Could not generate join code', code: 'INTERNAL_ERROR' },
    { status: 500 }
  )
}

// DELETE — revoke the join code (owner only)
export async function DELETE(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'adventure', 'play')
  if (isNextResponse(result)) return result

  const { id: sessionId } = await params

  const session = await prisma.gameSession.findFirst({
    where: { id: sessionId, userId: result.user.sub },
    select: { id: true },
  })

  if (!session) {
    return NextResponse.json(
      { error: 'Session not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  await prisma.$transaction([
    prisma.gameSession.update({
      where: { id: sessionId },
      data: { joinCode: null },
    }),
    prisma.sessionParticipant.deleteMany({
      where: { sessionId },
    }),
  ])

  return NextResponse.json({ data: { revoked: true } })
}
