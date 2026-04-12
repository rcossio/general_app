import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  storeRefreshToken,
} from '@/lib/auth'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  name: z.string().min(1).max(100),
  privacyAccepted: z.literal(true, { message: 'You must accept the privacy policy and terms of service' }),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation error", code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { email, password, name } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered', code: 'EMAIL_EXISTS' },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: { email, passwordHash, name, privacyAcceptedAt: new Date() },
      select: { id: true, email: true, name: true, avatarUrl: true },
    })

    // Assign 'user' role
    const userRole = await prisma.role.findUnique({ where: { slug: 'user' } })
    if (userRole) {
      await prisma.userRole.create({ data: { userId: user.id, roleId: userRole.id } })
    }

    audit('user_registered', { userId: user.id, email })

    const payload = { sub: user.id, email: user.email, roles: ['user'] }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)
    await storeRefreshToken(user.id, refreshToken)

    const response = NextResponse.json(
      { data: { user, accessToken, refreshToken } },
      { status: 201 }
    )
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
