import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  userId: z.string().cuid(),
  permission: z.string().regex(/^[a-z_]+:[a-z_]+$/, 'Must be resource:action format'),
})

// POST — grant a direct permission to a user
export async function POST(request: NextRequest) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result

  const isAdmin = result.user.roles.some((r) => ['master_admin', 'admin'].includes(r))
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden', code: 'PERMISSION_DENIED' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Validation error', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { userId, permission: permStr } = parsed.data
    const [resource, action] = permStr.split(':')

    const perm = await prisma.permission.findUnique({
      where: { resource_action: { resource, action } },
    })
    if (!perm) {
      return NextResponse.json({ error: 'Permission not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    await prisma.userPermission.upsert({
      where: { userId_permissionId: { userId, permissionId: perm.id } },
      update: {},
      create: { userId, permissionId: perm.id },
    })

    audit('permission_granted', { adminId: result.user.sub, targetUserId: userId, permission: permStr })

    return NextResponse.json({ data: { granted: true } })
  } catch {
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// DELETE — revoke a direct permission from a user
export async function DELETE(request: NextRequest) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result

  const isAdmin = result.user.roles.some((r) => ['master_admin', 'admin'].includes(r))
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden', code: 'PERMISSION_DENIED' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Validation error', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { userId, permission: permStr } = parsed.data
    const [resource, action] = permStr.split(':')

    const perm = await prisma.permission.findUnique({
      where: { resource_action: { resource, action } },
    })
    if (!perm) {
      return NextResponse.json({ error: 'Permission not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    await prisma.userPermission.deleteMany({
      where: { userId, permissionId: perm.id },
    })

    audit('permission_revoked', { adminId: result.user.sub, targetUserId: userId, permission: permStr })

    return NextResponse.json({ data: { revoked: true } })
  } catch {
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
