import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const assignSchema = z.object({
  userId: z.string().cuid(),
  role: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result

  const isAdmin = result.user.roles.some((r) => ['master_admin', 'admin'].includes(r))
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden', code: 'PERMISSION_DENIED' }, { status: 403 })
  }

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
    const roleRecord = await prisma.role.findUnique({ where: { slug: role } })
    if (!roleRecord) {
      return NextResponse.json({ error: 'Role not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: roleRecord.id } },
      update: {},
      create: { userId, roleId: roleRecord.id },
    })

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
