import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isNextResponse, invalidatePermissionCache } from '@/lib/permissions'
import { parseJson } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({ action: z.enum(['approve', 'deny']) })

// POST — approve or deny a pending event-quota request. Approving grants the
// user the events:unlimited permission (lifting their weekly cap).
export async function POST(request: NextRequest, { params }: Params) {
  const result = await requireAdmin(request)
  if (isNextResponse(result)) return result
  const { id } = await params

  const input = await parseJson(request, schema)
  if (isNextResponse(input)) return input

  const req = await prisma.eventQuotaRequest.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  })
  if (!req) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  if (req.status !== 'pending') {
    return NextResponse.json({ error: 'Already reviewed', code: 'ALREADY_REVIEWED' }, { status: 400 })
  }

  if (input.action === 'approve') {
    const perm = await prisma.permission.findUnique({
      where: { resource_action: { resource: 'events', action: 'unlimited' } },
      select: { id: true },
    })
    if (!perm) {
      return NextResponse.json({ error: 'Permission not seeded', code: 'INTERNAL_ERROR' }, { status: 500 })
    }
    await prisma.userPermission.upsert({
      where: { userId_permissionId: { userId: req.userId, permissionId: perm.id } },
      update: {},
      create: { userId: req.userId, permissionId: perm.id },
    })
    invalidatePermissionCache(req.userId)
  }

  await prisma.eventQuotaRequest.update({
    where: { id: req.id },
    data: {
      status: input.action === 'approve' ? 'approved' : 'denied',
      reviewedByUserId: result.user.sub,
      reviewedAt: new Date(),
    },
  })
  audit('event_request_reviewed', { adminId: result.user.sub, targetUserId: req.userId, action: input.action })

  return NextResponse.json({ data: { status: input.action === 'approve' ? 'approved' : 'denied' } })
}
