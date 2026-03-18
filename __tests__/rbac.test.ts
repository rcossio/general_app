import { describe, it, expect } from 'vitest'
import { prisma } from '../lib/prisma'
import { hashPassword, signAccessToken } from '../lib/auth'
import { requirePermission } from '../lib/permissions'
import { NextRequest } from 'next/server'

async function createUserWithRole(email: string, roleSlug: string) {
  const passwordHash = await hashPassword('password123')

  let role = await prisma.role.findUnique({ where: { slug: roleSlug } })
  if (!role) {
    role = await prisma.role.create({
      data: { name: roleSlug, slug: roleSlug },
    })
  }

  const user = await prisma.user.create({
    data: { email, passwordHash, name: 'Test' },
  })
  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } })

  const token = signAccessToken({ sub: user.id, email, roles: [roleSlug] })
  return { user, token, role }
}

async function createPermission(resource: string, action: string) {
  return prisma.permission.upsert({
    where: { resource_action: { resource, action } },
    update: {},
    create: { resource, action },
  })
}

function makeRequest(token: string) {
  return new NextRequest('http://localhost/api/test', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

describe('RBAC', () => {
  it('user with "user" role cannot access an admin-only endpoint (403)', async () => {
    const { token } = await createUserWithRole('user@test.com', 'user')
    await createPermission('admin', 'access')

    const req = makeRequest(token)
    const result = await requirePermission(req as unknown as Request, 'admin', 'access')

    expect(result).toHaveProperty('status', 403)
  })

  it('user with "admin" role bypasses permission checks', async () => {
    const { token } = await createUserWithRole('admin@test.com', 'admin')

    const req = makeRequest(token)
    const result = await requirePermission(req as unknown as Request, 'anything', 'anyaction')

    expect(result).not.toHaveProperty('status')
    expect(result).toHaveProperty('user')
  })

  it('master_admin bypasses all permission checks', async () => {
    const { token } = await createUserWithRole('master@test.com', 'master_admin')

    const req = makeRequest(token)
    const result = await requirePermission(req as unknown as Request, 'any', 'permission')

    expect(result).not.toHaveProperty('status')
    expect(result).toHaveProperty('user')
  })

  it('requirePermission returns 403 with correct error code when permission is missing', async () => {
    const { token } = await createUserWithRole('noperm@test.com', 'user')

    const req = makeRequest(token)
    const result = await requirePermission(req as unknown as Request, 'workout', 'create')

    expect(result).toHaveProperty('status', 403)
    const body = await (result as Response).json()
    expect(body.code).toBe('PERMISSION_DENIED')
  })

  it('requirePermission returns 401 when no token is provided', async () => {
    const req = new NextRequest('http://localhost/api/test')
    const result = await requirePermission(req as unknown as Request, 'workout', 'read')

    expect(result).toHaveProperty('status', 401)
    const body = await (result as Response).json()
    expect(body.code).toBe('AUTH_REQUIRED')
  })
})
