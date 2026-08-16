import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isNextResponse } from '@/lib/permissions'
import { parseJson } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { quotaRequestSchema } from '@/modules/events/lib/schemas'

// POST — user asks an admin to lift their weekly cap. Idempotent: if a pending
// request already exists, it's returned rather than duplicated.
export async function POST(request: NextRequest) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result

  const input = await parseJson(request, quotaRequestSchema)
  if (isNextResponse(input)) return input

  const existing = await prisma.eventQuotaRequest.findFirst({
    where: { userId: result.user.sub, status: 'pending' },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ data: { pending: true } })
  }

  await prisma.eventQuotaRequest.create({
    data: { userId: result.user.sub, message: input.message || null },
  })
  return NextResponse.json({ data: { pending: true } }, { status: 201 })
}
