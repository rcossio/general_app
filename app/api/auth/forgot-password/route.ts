import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { sendPasswordResetEmail } from '@/lib/email'
import { createHash, randomBytes } from 'crypto'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { email } = parsed.data

    // Rate limit: max 1 token per email per 5 minutes
    const recentToken = await prisma.passwordResetToken.findFirst({
      where: {
        user: { email },
        createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
      },
    })

    if (recentToken) {
      // Return success anyway to prevent email enumeration
      return NextResponse.json({ data: { sent: true } })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    })

    // Always return success to prevent email enumeration
    if (!user || user.passwordHash.startsWith('oauth:')) {
      return NextResponse.json({ data: { sent: true } })
    }

    // Generate token
    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })

    const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`
    await sendPasswordResetEmail(user.email, resetUrl)

    return NextResponse.json({ data: { sent: true } })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
