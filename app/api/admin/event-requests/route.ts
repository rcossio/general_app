import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// GET — pending event-publishing requests for the admin review queue.
export async function GET(request: NextRequest) {
  const result = await requireAdmin(request)
  if (isNextResponse(result)) return result

  const requests = await prisma.eventQuotaRequest.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      message: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  })
  return NextResponse.json({ data: { requests } })
}
