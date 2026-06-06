import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const result = await requirePermission(request, 'tracker', 'read')
  if (isNextResponse(result)) return result

  try {
    const userId = result.user.sub

    const entries = await prisma.trackerEntry.findMany({
      where: { userId },
      select: { type: true, score: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // Calculate average score per type
    const typeStats: Record<string, { total: number; count: number; avg: number }> = {}
    for (const entry of entries) {
      if (!typeStats[entry.type]) {
        typeStats[entry.type] = { total: 0, count: 0, avg: 0 }
      }
      typeStats[entry.type].total += entry.score
      typeStats[entry.type].count += 1
    }
    for (const type in typeStats) {
      typeStats[type].avg = typeStats[type].total / typeStats[type].count
    }

    // Last 30 days trend
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentEntries = entries.filter((e) => e.createdAt >= thirtyDaysAgo)
    const dailyTrend: Record<string, number[]> = {}
    for (const entry of recentEntries) {
      const day = entry.createdAt.toISOString().split('T')[0]
      if (!dailyTrend[day]) dailyTrend[day] = []
      dailyTrend[day].push(entry.score)
    }
    const trend = Object.entries(dailyTrend).map(([date, scores]) => ({
      date,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))

    const response = NextResponse.json({ data: { typeStats, trend, total: entries.length } })
    // Cache 60 seconds per user
    response.headers.set('Cache-Control', 'private, max-age=60')
    return response
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
