import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { associationUpdateSchema } from '@/modules/associations/lib/schemas'

type Params = { params: Promise<{ id: string }> }

const SELECT = {
  id: true,
  name: true,
  description: true,
  website: true,
  facebook: true,
  instagram: true,
  email: true,
  phone: true,
  address: true,
  lat: true,
  lng: true,
} as const

// PATCH — update an association (admin only).
export async function PATCH(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'associations', 'manage')
  if (isNextResponse(result)) return result
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'BAD_REQUEST' }, { status: 400 })
  }

  const parsed = associationUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation error', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const existing = await prisma.association.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  try {
    const association = await prisma.association.update({
      where: { id },
      data: parsed.data,
      select: SELECT,
    })
    return NextResponse.json({ data: { association } })
  } catch {
    return NextResponse.json(
      { error: 'An association with this name already exists', code: 'DUPLICATE_NAME' },
      { status: 409 }
    )
  }
}

// DELETE — remove an association (admin only).
export async function DELETE(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'associations', 'manage')
  if (isNextResponse(result)) return result
  const { id } = await params

  const existing = await prisma.association.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  await prisma.association.delete({ where: { id } })
  return NextResponse.json({ data: { deleted: true } })
}
