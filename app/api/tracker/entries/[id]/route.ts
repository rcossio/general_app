import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isNextResponse } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { updateEntrySchema } from '@/modules/life-tracker/lib/schemas'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'tracker', 'read')
  if (isNextResponse(result)) return result

  const { id } = await params
  const entry = await prisma.trackerEntry.findFirst({
    where: { id, userId: result.user.sub },
    select: {
      id: true, type: true, title: true, content: true,
      score: true, tags: true, createdAt: true,
    },
  })

  if (!entry) {
    return NextResponse.json(
      { error: 'Entry not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  return NextResponse.json({ data: entry })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'tracker', 'update')
  if (isNextResponse(result)) return result

  const { id } = await params
  const entry = await prisma.trackerEntry.findFirst({
    where: { id, userId: result.user.sub },
    select: { id: true },
  })
  if (!entry) {
    return NextResponse.json(
      { error: 'Entry not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  try {
    const body = await request.json()
    const parsed = updateEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation error", code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const updated = await prisma.trackerEntry.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true, type: true, title: true, content: true,
        score: true, tags: true, createdAt: true,
      },
    })
    return NextResponse.json({ data: updated })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const result = await requirePermission(request, 'tracker', 'delete')
  if (isNextResponse(result)) return result

  const { id } = await params
  const entry = await prisma.trackerEntry.findFirst({
    where: { id, userId: result.user.sub },
    select: { id: true },
  })
  if (!entry) {
    return NextResponse.json(
      { error: 'Entry not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  await prisma.trackerEntry.delete({ where: { id } })
  return NextResponse.json({ data: { success: true } })
}
