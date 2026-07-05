import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { parseJson } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { activityUpdateSchema } from '@/modules/activities/lib/schemas'

type Params = { params: Promise<{ id: string }> }

const SELECT = {
  id: true,
  name: true,
  category: true,
  type: true,
  address: true,
  city: true,
  phone: true,
  notes: true,
  lat: true,
  lng: true,
} as const

// PATCH — update an activity (admin only).
export async function PATCH(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'activities', 'manage')
  if (isNextResponse(result)) return result
  const { id } = await params

  const input = await parseJson(request, activityUpdateSchema)
  if (isNextResponse(input)) return input

  const existing = await prisma.activity.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

  try {
    const activity = await prisma.activity.update({ where: { id }, data: input, select: SELECT })
    return NextResponse.json({ data: { activity } })
  } catch {
    return NextResponse.json({ error: 'An activity with this name already exists', code: 'DUPLICATE_NAME' }, { status: 409 })
  }
}

// DELETE — remove an activity (admin only).
export async function DELETE(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'activities', 'manage')
  if (isNextResponse(result)) return result
  const { id } = await params

  const existing = await prisma.activity.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

  await prisma.activity.delete({ where: { id } })
  return NextResponse.json({ data: { deleted: true } })
}
