import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  storeRefreshToken,
  revokeRefreshToken,
  validateRefreshToken,
} from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token =
      request.cookies.get('refresh_token')?.value ??
      (await request.json().catch(() => ({}))).refreshToken

    if (!token) {
      return NextResponse.json(
        { error: 'No refresh token', code: 'NO_TOKEN' },
        { status: 401 }
      )
    }

    let payload: ReturnType<typeof verifyRefreshToken>
    try {
      payload = verifyRefreshToken(token)
    } catch {
      return NextResponse.json(
        { error: 'Invalid refresh token', code: 'INVALID_TOKEN' },
        { status: 401 }
      )
    }

    const valid = await validateRefreshToken(token)
    if (!valid) {
      return NextResponse.json(
        { error: 'Token revoked or expired', code: 'TOKEN_REVOKED' },
        { status: 401 }
      )
    }

    // Rotation: revoke old, issue new pair
    await revokeRefreshToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        userRoles: { select: { role: { select: { slug: true } } } },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 401 }
      )
    }

    const roles = user.userRoles.map((ur) => ur.role.slug)
    const newPayload = { sub: user.id, email: user.email, roles }
    const accessToken = signAccessToken(newPayload)
    const refreshToken = signRefreshToken(newPayload)
    await storeRefreshToken(user.id, refreshToken)

    const response = NextResponse.json({ data: { accessToken, refreshToken } })
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
