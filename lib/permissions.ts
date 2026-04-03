import { NextResponse } from 'next/server'
import { getUserFromRequest, JwtPayload } from './auth'
import { prisma } from './prisma'

const BYPASS_ROLES = ['master_admin', 'admin']

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
  if (user.roles.some((r) => BYPASS_ROLES.includes(r))) {
    return { user }
  }

  // Check DB for specific permission (role-based OR direct user-permission)
  const userWithPerms = await prisma.user.findUnique({
    where: { id: user.sub },
    select: {
      userRoles: {
        select: {
          role: {
            select: {
              slug: true,
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

  const hasRolePerm = userWithPerms?.userRoles.some((ur) =>
    ur.role.rolePermissions.some(
      (rp) => rp.permission.resource === resource && rp.permission.action === action
    )
  )

  const hasDirectPerm = userWithPerms?.userPermissions.some(
    (up) => up.permission.resource === resource && up.permission.action === action
  )

  if (!hasRolePerm && !hasDirectPerm) {
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

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse
}
