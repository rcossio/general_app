import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { getUploadUrl } from '@/lib/storage'

// POST — presigned PUT URL for an event image (R2, events/ prefix). The client
// resizes to JPEG and PUTs directly to R2; the server never handles the bytes.
export async function POST(request: NextRequest) {
  const result = await requirePermission(request, 'events', 'create')
  if (isNextResponse(result)) return result

  const key = `events/${randomUUID()}.jpg`
  const uploadUrl = await getUploadUrl(key, 'image/jpeg')
  return NextResponse.json({ data: { uploadUrl, key } })
}
