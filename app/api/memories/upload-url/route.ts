import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { requireAuth, isNextResponse } from '@/lib/permissions'
import { getUploadUrl } from '@/lib/storage'

// POST — presigned PUT URL for a memorial post image (R2, under the memories/
// prefix). The client resizes to JPEG, PUTs directly, then saves the returned
// key on the post. Auth-gated; ownership of the target post is enforced when the
// post is saved (the key is validated to the memories/ namespace there).
export async function POST(request: NextRequest) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result

  const key = `memories/${randomUUID()}.jpg`
  const uploadUrl = await getUploadUrl(key, 'image/jpeg')

  return NextResponse.json({ data: { uploadUrl, key } })
}
