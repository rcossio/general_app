import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
})

export async function GET(request: NextRequest) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result

  try {
    const user = await prisma.user.findUnique({
      where: { id: result.user.sub },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                slug: true,
                name: true,
                rolePermissions: {
                  select: {
                    permission: { select: { resource: true, action: true } },
                  },
                },
              },
            },
          },
        },
        userPermissions: {
          select: {
            permission: { select: { resource: true, action: true } },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      )
    }

    const roles = user.userRoles.map((ur) => ur.role.slug)
    const rolePermissions = user.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`
      )
    )
    const directPermissions = user.userPermissions.map(
      (up) => `${up.permission.resource}:${up.permission.action}`
    )
    const permissions = [...rolePermissions, ...directPermissions]

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        roles,
        permissions: Array.from(new Set(permissions)),
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: result.user.sub },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.avatarUrl !== undefined && { avatarUrl: parsed.data.avatarUrl || null }),
    },
    select: { id: true, email: true, name: true, avatarUrl: true },
  })

  return NextResponse.json({ data: updated })
}
