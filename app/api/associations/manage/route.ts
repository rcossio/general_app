import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isNextResponse } from '@/lib/permissions'
import { isAdminRole } from '@/lib/roles'

// GET — reports whether the current user may manage the directory. Requires a
// valid token (401 without), returns 200 for any authenticated user. The
// associations page uses this to decide whether to show the admin add/edit/
// delete controls; it also serves as the module's RBAC testEndpoint.
export async function GET(request: NextRequest) {
  const result = await requireAuth(request)
  if (isNextResponse(result)) return result

  return NextResponse.json({ data: { canManage: isAdminRole(result.user.roles) } })
}
