import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken, storeRefreshToken } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=google_cancelled`)
  }

  // Verify OAuth state parameter to prevent CSRF
  const storedState = request.cookies.get('oauth_state')?.value
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/login?error=google_failed`)
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${appUrl}/login?error=google_failed`)
    }

    const { access_token } = await tokenRes.json()

    // Get user info from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!userRes.ok) {
      return NextResponse.redirect(`${appUrl}/login?error=google_failed`)
    }

    const googleUser = await userRes.json()
    const { email, name, picture } = googleUser

    // Find or create user
    // OAuth users get a random password hash that can never be matched by bcrypt
    const oauthPlaceholderHash = `oauth:${randomBytes(32).toString('hex')}`

    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, userRoles: { select: { role: { select: { slug: true } } } } },
    })

    if (!user) {
      audit('oauth_signup', { email, provider: 'google' })
      const userRole = await prisma.role.findUnique({ where: { slug: 'user' } })
      user = await prisma.user.create({
        data: {
          email,
          name: name ?? email.split('@')[0],
          passwordHash: oauthPlaceholderHash,
          avatarUrl: picture ?? null,
          ...(userRole ? { userRoles: { create: { roleId: userRole.id } } } : {}),
        },
        select: { id: true, email: true, name: true, userRoles: { select: { role: { select: { slug: true } } } } },
      })
    }

    const roles = user.userRoles.map((ur) => ur.role.slug)
    const payload = { sub: user.id, email: user.email, roles }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)
    await storeRefreshToken(user.id, refreshToken)

    const response = NextResponse.redirect(`${appUrl}/`)
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })
    // Clear the oauth state cookie
    response.cookies.delete('oauth_state')
    return response
  } catch {
    return NextResponse.redirect(`${appUrl}/login?error=google_failed`)
  }
}
