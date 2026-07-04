import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isNextResponse } from '@/lib/permissions'
import { getUserFromRequest } from '@/lib/auth'
import { parseJson } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { updateProfileSchema } from '@/modules/memories/lib/schemas'

type Params = { params: Promise<{ slug: string }> }

// GET — public read of a memorial profile + its posts (no auth). If a valid
// token is present, isOwner is set so the client can show edit affordances.
// userId is never exposed.
export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const user = getUserFromRequest(request)

  const profile = await prisma.memorialProfile.findUnique({
    where: { slug },
    select: {
      id: true,
      userId: true,
      name: true,
      subtitle: true,
      slug: true,
      facebook: true,
      instagram: true,
      tiktok: true,
      posts: {
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, content: true, images: true, locationLabel: true, lat: true, lng: true, position: true },
      },
    },
  })
  if (!profile) {
    return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  const { userId, ...pub } = profile
  return NextResponse.json({
    data: { profile: { ...pub, isOwner: !!user && userId === user.sub } },
  })
}

// PATCH — update profile fields (owner only).
export async function PATCH(request: NextRequest, { params }: Params) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result
  const { slug } = await params

  const existing = await prisma.memorialProfile.findUnique({ where: { slug }, select: { id: true, userId: true } })
  if (!existing) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  if (existing.userId !== result.user.sub) {
    return NextResponse.json({ error: 'Forbidden', code: 'PERMISSION_DENIED' }, { status: 403 })
  }

  const input = await parseJson(request, updateProfileSchema)
  if (isNextResponse(input)) return input

  await prisma.memorialProfile.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      subtitle: input.subtitle || null,
      facebook: input.facebook || null,
      instagram: input.instagram || null,
      tiktok: input.tiktok || null,
    },
  })
  return NextResponse.json({ data: { ok: true } })
}

// DELETE — remove a memorial and its posts (owner only; posts cascade).
export async function DELETE(request: NextRequest, { params }: Params) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result
  const { slug } = await params

  const existing = await prisma.memorialProfile.findUnique({ where: { slug }, select: { id: true, userId: true } })
  if (!existing) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  if (existing.userId !== result.user.sub) {
    return NextResponse.json({ error: 'Forbidden', code: 'PERMISSION_DENIED' }, { status: 403 })
  }

  await prisma.memorialProfile.delete({ where: { id: existing.id } })
  return NextResponse.json({ data: { deleted: true } })
}
