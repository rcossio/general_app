import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getPublicUrl } from '@/lib/storage'
import { markFixedSchema } from '@/modules/community/lib/schemas'

const BYPASS_ROLES = ['master_admin', 'admin']
type Params = { params: Promise<{ id: string }> }

// DELETE — owner removes their own notice; admins can remove any.
export async function DELETE(request: NextRequest, { params }: Params) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result
  const { id } = await params

  const notice = await prisma.communityNotice.findUnique({ where: { id }, select: { userId: true } })
  if (!notice) {
    return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  const isAdmin = result.user.roles.some((r) => BYPASS_ROLES.includes(r))
  if (notice.userId !== result.user.sub && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden', code: 'PERMISSION_DENIED' }, { status: 403 })
  }

  await prisma.communityNotice.delete({ where: { id } })
  return NextResponse.json({ data: { deleted: true } })
}

// PATCH — any logged-in volunteer marks the notice fixed, with before/after photos.
export async function PATCH(request: NextRequest, { params }: Params) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'BAD_REQUEST' }, { status: 400 })
  }
  const parsed = markFixedSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', code: 'VALIDATION_ERROR' }, { status: 400 })
  }
  const { beforePhotoKey, afterPhotoKey } = parsed.data
  if (!beforePhotoKey.startsWith('community/') || !afterPhotoKey.startsWith('community/')) {
    return NextResponse.json({ error: 'Invalid photo key', code: 'BAD_REQUEST' }, { status: 400 })
  }

  const existing = await prisma.communityNotice.findUnique({ where: { id }, select: { status: true } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }
  if (existing.status !== 'open') {
    return NextResponse.json({ error: 'Already fixed', code: 'ALREADY_FIXED' }, { status: 400 })
  }

  const notice = await prisma.communityNotice.update({
    where: { id },
    data: {
      status: 'fixed',
      fixedAt: new Date(),
      fixedByUserId: result.user.sub,
      beforePhotoUrl: getPublicUrl(beforePhotoKey),
      afterPhotoUrl: getPublicUrl(afterPhotoKey),
    },
    select: {
      id: true,
      category: true,
      lat: true,
      lng: true,
      note: true,
      photoUrl: true,
      status: true,
      createdAt: true,
      fixedAt: true,
      beforePhotoUrl: true,
      afterPhotoUrl: true,
    },
  })

  return NextResponse.json({ data: { notice } })
}
