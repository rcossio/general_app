import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireAuth, isNextResponse } from '@/lib/permissions'
import { parseJson } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { postSchema, isValidMemoryImageKey } from '@/modules/memories/lib/schemas'

type Params = { params: Promise<{ slug: string; postId: string }> }

// Load the post and confirm it belongs to the slug's profile AND the caller
// owns that profile. Returns the profile id + post id, or a NextResponse error.
async function authorizePostOwner(request: NextRequest, slug: string, postId: string) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result

  const post = await prisma.memorialPost.findUnique({
    where: { id: postId },
    select: { id: true, profile: { select: { slug: true, userId: true } } },
  })
  if (!post || post.profile.slug !== slug) {
    return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }
  if (post.profile.userId !== result.user.sub) {
    return NextResponse.json({ error: 'Forbidden', code: 'PERMISSION_DENIED' }, { status: 403 })
  }
  return { postId: post.id }
}

const POST_SELECT = {
  id: true,
  content: true,
  images: true,
  locationLabel: true,
  lat: true,
  lng: true,
  position: true,
}

// PATCH — edit a post (owner only). Replaces content/images/location.
export async function PATCH(request: NextRequest, { params }: Params) {
  const { slug, postId } = await params
  const auth = await authorizePostOwner(request, slug, postId)
  if (isNextResponse(auth)) return auth

  const input = await parseJson(request, postSchema)
  if (isNextResponse(input)) return input
  if (!input.images.every(isValidMemoryImageKey)) {
    return NextResponse.json({ error: 'Invalid image key', code: 'BAD_REQUEST' }, { status: 400 })
  }

  const post = await prisma.memorialPost.update({
    where: { id: auth.postId },
    data: {
      content: input.content as Prisma.InputJsonValue,
      images: input.images,
      locationLabel: input.locationLabel || null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
    },
    select: POST_SELECT,
  })
  return NextResponse.json({ data: { post } })
}

// DELETE — remove a post (owner only).
export async function DELETE(request: NextRequest, { params }: Params) {
  const { slug, postId } = await params
  const auth = await authorizePostOwner(request, slug, postId)
  if (isNextResponse(auth)) return auth

  await prisma.memorialPost.delete({ where: { id: auth.postId } })
  return NextResponse.json({ data: { deleted: true } })
}
