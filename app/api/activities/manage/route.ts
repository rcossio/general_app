import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isNextResponse } from '@/lib/permissions'
import { isAdminRole } from '@/lib/roles'

// GET — whether the current user may manage the directory. 401 without a token,
// 200 for any authed user; also the module's RBAC test endpoint.
export async function GET(request: NextRequest) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result
  return NextResponse.json({ data: { canManage: isAdminRole(result.user.roles) } })
}
