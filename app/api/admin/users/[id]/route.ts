import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(request: NextRequest, { params }: Params) {
  const result = await requireAdmin(request)
  if (isNextResponse(result)) return result

  const { id } = await params

  // Cannot delete yourself
  if (id === result.user.sub) {
    return NextResponse.json(
      { error: 'Cannot delete your own account', code: 'SELF_DELETE' },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json(
      { error: 'User not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  await prisma.user.delete({ where: { id } })

  audit('user_deleted', { adminId: result.user.sub, deletedUserId: id })

  return NextResponse.json({ data: { deleted: true } })
}
