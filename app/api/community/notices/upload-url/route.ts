import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { getUploadUrl } from '@/lib/storage'

// POST — presigned PUT URL for a notice photo (reuses the avatars R2 bucket
// under the community/ prefix). Client uploads the webp directly, then submits
// the notice with the returned key.
export async function POST(request: NextRequest) {
  const result = await requirePermission(request, 'community', 'create')
  if (isNextResponse(result)) return result

  const key = `community/${randomUUID()}.jpg`
  const uploadUrl = await getUploadUrl(key, 'image/jpeg')

  return NextResponse.json({ data: { uploadUrl, key } })
}
