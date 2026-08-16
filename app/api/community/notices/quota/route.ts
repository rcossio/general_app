import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS
const DAILY_MAX = 1
const WEEKLY_MAX = 3

// GET — the current user's reporting quota, so the UI can show what's left.
export async function GET(request: NextRequest) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result

  const now = Date.now()
  const recent = await prisma.communityNotice.findMany({
    where: { userId: result.user.sub, createdAt: { gte: new Date(now - WEEK_MS) } },
    select: { createdAt: true },
  })
  const usedToday = recent.filter((n) => n.createdAt.getTime() > now - DAY_MS).length
  const usedWeek = recent.length

  return NextResponse.json({
    data: {
      usedToday,
      usedWeek,
      dailyMax: DAILY_MAX,
      weeklyMax: WEEKLY_MAX,
      canPost: usedToday < DAILY_MAX && usedWeek < WEEKLY_MAX,
    },
  })
}
