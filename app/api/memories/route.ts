import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requirePermission, isNextResponse } from '@/lib/permissions'
import { parseJson } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { createProfileSchema } from '@/modules/memories/lib/schemas'
import { makeSlug } from '@/modules/memories/lib/slug'

// GET — the caller's own memorial profiles (auth). Also the module's RBAC test
// endpoint: 401 without a token, 200 (possibly empty) for any authed user.
export async function GET(request: NextRequest) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result

  const profiles = await prisma.memorialProfile.findMany({
    where: { userId: result.user.sub },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      subtitle: true,
      slug: true,
      _count: { select: { posts: true } },
    },
  })

  const data = profiles.map((p) => ({
    id: p.id,
    name: p.name,
    subtitle: p.subtitle,
    slug: p.slug,
    postCount: p._count.posts,
  }))
  return NextResponse.json({ data: { profiles: data } })
}

// POST — create a memorial (any logged-in user; memories:create is in the
// allowlist). Generates a readable unique slug, retrying on the (near-impossible)
// collision.
export async function POST(request: NextRequest) {
  const result = await requirePermission(request, 'memories', 'create')
  if (isNextResponse(result)) return result

  const input = await parseJson(request, createProfileSchema)
  if (isNextResponse(input)) return input

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const profile = await prisma.memorialProfile.create({
        data: {
          userId: result.user.sub,
          name: input.name,
          subtitle: input.subtitle || null,
          slug: makeSlug(input.name),
        },
        select: { slug: true },
      })
      return NextResponse.json({ data: { slug: profile.slug } }, { status: 201 })
    } catch {
      // retry with a fresh slug
    }
  }
  return NextResponse.json({ error: 'Could not create memorial', code: 'INTERNAL_ERROR' }, { status: 500 })
}
