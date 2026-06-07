import { NextResponse } from 'next/server'
import { getUserFromRequest, JwtPayload } from './auth'
import { prisma } from './prisma'
import { isAdminRole } from './roles'

// In-process cache of each user's merged permission set (role-based + direct).
// The role→permission mapping is effectively static (seeded), so re-querying it
// on every request is pure waste. TTL keeps grant/revoke lag bounded; each PM2
// worker keeps its own cache. Invalidated explicitly when an admin mutates a
// user's roles/permissions (see invalidatePermissionCache).
const PERM_CACHE_TTL_MS = 60_000
const permCache = new Map<string, { perms: Set<string>; expires: number }>()

export function invalidatePermissionCache(userId: string): void {
  permCache.delete(userId)
}

async function loadUserPermissions(userId: string): Promise<Set<string>> {
  const cached = permCache.get(userId)
  if (cached && cached.expires > Date.now()) return cached.perms

  const userWithPerms = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userRoles: {
        select: {
          role: {
            select: {
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

  const perms = new Set<string>()
  for (const ur of userWithPerms?.userRoles ?? []) {
    for (const rp of ur.role.rolePermissions) {
      perms.add(`${rp.permission.resource}:${rp.permission.action}`)
    }
  }
  for (const up of userWithPerms?.userPermissions ?? []) {
    perms.add(`${up.permission.resource}:${up.permission.action}`)
  }

  permCache.set(userId, { perms, expires: Date.now() + PERM_CACHE_TTL_MS })
  return perms
}

export async function requirePermission(
  request: Request,
  resource: string,
  action: string
): Promise<{ user: JwtPayload } | NextResponse> {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  // master_admin and admin bypass all checks
  if (isAdminRole(user.roles)) {
    return { user }
  }

  const perms = await loadUserPermissions(user.sub)
  if (!perms.has(`${resource}:${action}`)) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'PERMISSION_DENIED' },
      { status: 403 }
    )
  }

  return { user }
}

export async function requireAuth(
  request: Request
): Promise<{ user: JwtPayload } | NextResponse> {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }
  return { user }
}

// Requires the caller to be an admin (master_admin or admin). Used by admin-only
// routes instead of requireAuth + a hand-rolled role check.
export async function requireAdmin(
  request: Request
): Promise<{ user: JwtPayload } | NextResponse> {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result
  if (!isAdminRole(result.user.roles)) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'PERMISSION_DENIED' },
      { status: 403 }
    )
  }
  return result
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse
}
