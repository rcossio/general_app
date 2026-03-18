import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/permissions'
import { getUploadUrl } from '@/lib/storage'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const key = `avatars/${auth.user.sub}.webp`
  const uploadUrl = await getUploadUrl(key)

  return NextResponse.json({ data: { uploadUrl, key } })
}
