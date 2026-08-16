import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isNextResponse, invalidatePermissionCache } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const assignSchema = z.object({
  userId: z.string().cuid(),
  role: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const result = await requireAdmin(request)
  if (isNextResponse(result)) return result

  try {
    const body = await request.json()
    const parsed = assignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation error", code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { userId, role } = parsed.data

    // Only a master_admin may grant the master_admin role — otherwise a plain
    // admin could escalate themselves or a peer to the top tier.
    if (role === 'master_admin' && !result.user.roles.includes('master_admin')) {
      return NextResponse.json(
        { error: 'Only a master_admin can assign the master_admin role', code: 'PERMISSION_DENIED' },
        { status: 403 }
      )
    }

    const roleRecord = await prisma.role.findUnique({ where: { slug: role } })
    if (!roleRecord) {
      return NextResponse.json({ error: 'Role not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: roleRecord.id } },
      update: {},
      create: { userId, roleId: roleRecord.id },
    })

    invalidatePermissionCache(userId)
    audit('role_assigned', { adminId: result.user.sub, targetUserId: userId, role })

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
