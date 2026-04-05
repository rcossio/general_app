import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import {
  comparePassword,
  hashPassword,
  signAccessToken,
  signRefreshToken,
  storeRefreshToken,
} from '@/lib/auth'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  privacyAccepted: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation error", code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { email, password, privacyAccepted } = parsed.data
    const ip = request.headers.get('x-real-ip') ?? 'unknown'

    let user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        passwordHash: true,
        userRoles: { select: { role: { select: { slug: true } } } },
      },
    })

    let isNewUser = false

    if (!user) {
      // Auto-register: password must be at least 8 chars for new accounts
      if (password.length < 8) {
        audit('login_failed', { email, ip, reason: 'unknown_email' })
        return NextResponse.json(
          { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
          { status: 401 }
        )
      }

      // Consent required before storing personal data
      if (!privacyAccepted) {
        return NextResponse.json(
          { error: 'You must accept the privacy policy and terms of service', code: 'PRIVACY_REQUIRED' },
          { status: 400 }
        )
      }

      const passwordHash = await hashPassword(password)
      const defaultName = email.split('@')[0]
      const newUser = await prisma.user.create({
        data: { email, passwordHash, name: defaultName, privacyAcceptedAt: new Date() },
        select: { id: true, email: true, name: true, avatarUrl: true, passwordHash: true, userRoles: { select: { role: { select: { slug: true } } } } },
      })

      const userRole = await prisma.role.findUnique({ where: { slug: 'user' } })
      if (userRole) {
        await prisma.userRole.create({ data: { userId: newUser.id, roleId: userRole.id } })
      }

      audit('user_registered', { userId: newUser.id, email, method: 'auto' })
      user = {
        ...newUser,
        userRoles: userRole ? [{ role: { slug: 'user' } }] : [],
      }
      isNewUser = true
    } else {
      // Existing user — verify password
      const valid = await comparePassword(password, user.passwordHash)
      if (!valid) {
        audit('login_failed', { email, ip, reason: 'wrong_password' })
        return NextResponse.json(
          { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
          { status: 401 }
        )
      }
    }

    const roles = user.userRoles.map((ur) => ur.role.slug)
    const payload = { sub: user.id, email: user.email, roles }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)
    await storeRefreshToken(user.id, refreshToken)

    const { passwordHash: _, ...safeUser } = user

    const response = NextResponse.json({
      data: { user: safeUser, accessToken, refreshToken, isNewUser },
    })
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
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
