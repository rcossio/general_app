import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, userHasPermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { WEEKLY_EVENT_MAX, WEEK_MS } from '@/modules/events/lib/schemas'

// GET — the caller's weekly event quota (auth). Also the module's RBAC test
// endpoint: 401 without a token, 200 for any authed user.
export async function GET(request: NextRequest) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result

  const unlimited = await userHasPermission(result.user, 'events', 'unlimited')
  const usedThisWeek = await prisma.event.count({
    where: { userId: result.user.sub, createdAt: { gte: new Date(Date.now() - WEEK_MS) } },
  })
  const pending = await prisma.eventQuotaRequest.findFirst({
    where: { userId: result.user.sub, status: 'pending' },
    select: { id: true },
  })

  return NextResponse.json({
    data: {
      usedThisWeek,
      weeklyMax: unlimited ? null : WEEKLY_EVENT_MAX,
      canPost: unlimited || usedThisWeek < WEEKLY_EVENT_MAX,
      hasPendingRequest: !!pending,
    },
  })
}
