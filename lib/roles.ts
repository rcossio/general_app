// Shared, dependency-free role helpers. Safe to import from both server route
// handlers and client components (no prisma / next/server imports here).

// Roles that bypass every permission check.
export const ADMIN_ROLES = ['master_admin', 'admin'] as const

export function isAdminRole(roles: string[] | null | undefined): boolean {
  if (!roles) return false
  return roles.some((r) => (ADMIN_ROLES as readonly string[]).includes(r))
}
