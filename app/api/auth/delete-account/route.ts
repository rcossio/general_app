import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'

// POST — soft delete: deactivate account, schedule hard delete in 30 days
export async function POST(request: NextRequest) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result

  const user = await prisma.user.findUnique({
    where: { id: result.user.sub },
    select: { id: true, deletedAt: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  if (user.deletedAt) {
    return NextResponse.json({ error: 'Account already deactivated', code: 'ALREADY_DELETED' }, { status: 400 })
  }

  // Soft delete: mark as deleted, revoke all refresh tokens
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revoked: true },
    }),
  ])

  audit('account_deactivated', { userId: user.id })

  // Clear the refresh cookie so the user is logged out
  const response = NextResponse.json({ data: { deactivated: true } })
  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
