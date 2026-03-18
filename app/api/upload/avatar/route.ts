import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/permissions'
import { getUploadUrl } from '@/lib/storage'
import { z } from 'zod'

const schema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid content type', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const ext = parsed.data.contentType.split('/')[1].replace('jpeg', 'jpg')
  const key = `avatars/${auth.user.sub}.${ext}`
  const uploadUrl = await getUploadUrl(key, parsed.data.contentType)

  return NextResponse.json({ data: { uploadUrl, key } })
}
