import { NextRequest, NextResponse } from 'next/server'
import { revokeRefreshToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token =
      request.cookies.get('refresh_token')?.value ??
      (await request.json().catch(() => ({}))).refreshToken

    if (token) {
      await revokeRefreshToken(token)
    }

    const response = NextResponse.json({ data: { success: true } })
    response.cookies.delete('refresh_token')
    return response
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
