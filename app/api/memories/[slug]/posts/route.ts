import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireAuth, isNextResponse } from '@/lib/permissions'
import { parseJson } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { postSchema, isValidMemoryImageKey } from '@/modules/memories/lib/schemas'

type Params = { params: Promise<{ slug: string }> }

const POST_SELECT = {
  id: true,
  content: true,
  images: true,
  locationLabel: true,
  lat: true,
  lng: true,
  position: true,
}

// POST — add a post to a memorial (owner only). New posts go to the end.
export async function POST(request: NextRequest, { params }: Params) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result
  const { slug } = await params

  const profile = await prisma.memorialProfile.findUnique({ where: { slug }, select: { id: true, userId: true } })
  if (!profile) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  if (profile.userId !== result.user.sub) {
    return NextResponse.json({ error: 'Forbidden', code: 'PERMISSION_DENIED' }, { status: 403 })
  }

  const input = await parseJson(request, postSchema)
  if (isNextResponse(input)) return input
  if (!input.images.every(isValidMemoryImageKey)) {
    return NextResponse.json({ error: 'Invalid image key', code: 'BAD_REQUEST' }, { status: 400 })
  }

  const last = await prisma.memorialPost.findFirst({
    where: { profileId: profile.id },
    orderBy: { position: 'desc' },
    select: { position: true },
  })
  const position = (last?.position ?? -1) + 1

  const post = await prisma.memorialPost.create({
    data: {
      profileId: profile.id,
      content: input.content as Prisma.InputJsonValue,
      images: input.images,
      locationLabel: input.locationLabel || null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      position,
    },
    select: POST_SELECT,
  })
  return NextResponse.json({ data: { post } }, { status: 201 })
}
