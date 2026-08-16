import { describe, it, expect } from 'vitest'
import { BASE, registerAndLogin, authHeaders, login } from './helpers'

// Admin credentials come from the environment (the seeded master_admin).
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!

async function loginAsAdmin(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  const body = await res.json()
  return body.data?.accessToken as string
}

/** Look up a freshly-created user's row (roles + directPermissions) via the admin list. */
async function findUser(adminToken: string, email: string) {
  const res = await fetch(
    `${BASE}/api/admin/users?search=${encodeURIComponent(email)}&limit=50`,
    { headers: authHeaders(adminToken) }
  )
  expect(res.status).toBe(200)
  const { data } = await res.json()
  return data.users.find((u: { email: string }) => u.email === email) as
    | { id: string; email: string; roles: string[]; directPermissions: string[] }
    | undefined
}

async function getMyPermissions(token: string): Promise<string[]> {
  const res = await fetch(`${BASE}/api/auth/me`, { headers: authHeaders(token) })
  expect(res.status).toBe(200)
  const { data } = await res.json()
  return data.permissions as string[]
}

// A valid seeded permission that regular users do NOT get by default
// (not in the seed userAllowlist), so a fresh user provably lacks it.
const GRANTABLE_PERMISSION = 'community:moderate'

describe('Admin: assign role (POST /api/admin/users/roles)', () => {
  it('returns 401 with no token', async () => {
    const res = await fetch(`${BASE}/api/admin/users/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'whatever', role: 'moderator' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 for a regular user', async () => {
    const { accessToken } = await registerAndLogin('admin-role-403')
    const res = await fetch(`${BASE}/api/admin/users/roles`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ userId: 'whatever', role: 'moderator' }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 400 for a malformed body', async () => {
    const adminToken = await loginAsAdmin()
    // userId must be a cuid; empty role also invalid.
    const res = await fetch(`${BASE}/api/admin/users/roles`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({ userId: 'not-a-cuid', role: '' }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 for an unknown role slug', async () => {
    const adminToken = await loginAsAdmin()
    const target = await registerAndLogin('admin-role-404')
    const targetRow = await findUser(adminToken, target.email)
    expect(targetRow).toBeTruthy()
    const res = await fetch(`${BASE}/api/admin/users/roles`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({ userId: targetRow!.id, role: 'no-such-role' }),
    })
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('NOT_FOUND')
  })

  it('assigns the moderator role to a fresh user (200) and it shows in the admin list', async () => {
    const adminToken = await loginAsAdmin()
    const target = await registerAndLogin('admin-role-ok')
    const before = await findUser(adminToken, target.email)
    expect(before).toBeTruthy()
    expect(before!.roles).not.toContain('moderator')

    const res = await fetch(`${BASE}/api/admin/users/roles`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({ userId: before!.id, role: 'moderator' }),
    })
    expect(res.status).toBe(200)
    expect((await res.json()).data.success).toBe(true)

    const after = await findUser(adminToken, target.email)
    expect(after!.roles).toContain('moderator')
  })

  it('escalation guard: a plain admin cannot assign master_admin (403)', async () => {
    const masterToken = await loginAsAdmin()

    // Create a fresh user and elevate them to plain `admin` via the master_admin.
    const wouldBeAdmin = await registerAndLogin('admin-escalation')
    const row = await findUser(masterToken, wouldBeAdmin.email)
    expect(row).toBeTruthy()
    const elevate = await fetch(`${BASE}/api/admin/users/roles`, {
      method: 'POST',
      headers: authHeaders(masterToken),
      body: JSON.stringify({ userId: row!.id, role: 'admin' }),
    })
    expect(elevate.status).toBe(200)

    // Re-login so the JWT carries the freshly-granted `admin` role (roles are
    // baked into the access token at login time).
    const { accessToken: plainAdminToken } = await login(
      wouldBeAdmin.email,
      wouldBeAdmin.password
    )
    // Sanity: this token can reach admin-only endpoints (is admin) ...
    const listRes = await fetch(`${BASE}/api/admin/users?limit=1`, {
      headers: authHeaders(plainAdminToken),
    })
    expect(listRes.status).toBe(200)

    // ... but must NOT be able to grant master_admin.
    const victim = await registerAndLogin('admin-escalation-victim')
    const victimRow = await findUser(masterToken, victim.email)
    const res = await fetch(`${BASE}/api/admin/users/roles`, {
      method: 'POST',
      headers: authHeaders(plainAdminToken),
      body: JSON.stringify({ userId: victimRow!.id, role: 'master_admin' }),
    })
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('PERMISSION_DENIED')
  })
})

describe('Admin: direct permissions (POST/DELETE /api/admin/users/permissions)', () => {
  it('POST returns 401 with no token', async () => {
    const res = await fetch(`${BASE}/api/admin/users/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'whatever', permission: GRANTABLE_PERMISSION }),
    })
    expect(res.status).toBe(401)
  })

  it('POST returns 403 for a regular user', async () => {
    const { accessToken } = await registerAndLogin('admin-perm-403')
    const res = await fetch(`${BASE}/api/admin/users/permissions`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ userId: 'whatever', permission: GRANTABLE_PERMISSION }),
    })
    expect(res.status).toBe(403)
  })

  it('DELETE returns 401 with no token', async () => {
    const res = await fetch(`${BASE}/api/admin/users/permissions`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'whatever', permission: GRANTABLE_PERMISSION }),
    })
    expect(res.status).toBe(401)
  })

  it('DELETE returns 403 for a regular user', async () => {
    const { accessToken } = await registerAndLogin('admin-perm-del-403')
    const res = await fetch(`${BASE}/api/admin/users/permissions`, {
      method: 'DELETE',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ userId: 'whatever', permission: GRANTABLE_PERMISSION }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 400 for a malformed permission string', async () => {
    const adminToken = await loginAsAdmin()
    const res = await fetch(`${BASE}/api/admin/users/permissions`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      // Not resource:action format, and userId not a cuid.
      body: JSON.stringify({ userId: 'not-a-cuid', permission: 'notvalid' }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 for a well-formed but unknown permission', async () => {
    const adminToken = await loginAsAdmin()
    const target = await registerAndLogin('admin-perm-404')
    const row = await findUser(adminToken, target.email)
    expect(row).toBeTruthy()
    const res = await fetch(`${BASE}/api/admin/users/permissions`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({ userId: row!.id, permission: 'ghost:action' }),
    })
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('NOT_FOUND')
  })

  it('grants a direct permission, the user sees it in /me, then revokes it', async () => {
    const adminToken = await loginAsAdmin()
    const target = await registerAndLogin('admin-perm-grant')
    const row = await findUser(adminToken, target.email)
    expect(row).toBeTruthy()

    // Precondition: fresh user does not already hold the grantable permission.
    const before = await getMyPermissions(target.accessToken)
    expect(before).not.toContain(GRANTABLE_PERMISSION)

    // Grant.
    const grant = await fetch(`${BASE}/api/admin/users/permissions`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({ userId: row!.id, permission: GRANTABLE_PERMISSION }),
    })
    expect(grant.status).toBe(200)
    expect((await grant.json()).data.granted).toBe(true)

    // The permission is merged into the user's /me permission list.
    const afterGrant = await getMyPermissions(target.accessToken)
    expect(afterGrant).toContain(GRANTABLE_PERMISSION)

    // Revoke.
    const revoke = await fetch(`${BASE}/api/admin/users/permissions`, {
      method: 'DELETE',
      headers: authHeaders(adminToken),
      body: JSON.stringify({ userId: row!.id, permission: GRANTABLE_PERMISSION }),
    })
    expect(revoke.status).toBe(200)
    expect((await revoke.json()).data.revoked).toBe(true)

    // Gone again.
    const afterRevoke = await getMyPermissions(target.accessToken)
    expect(afterRevoke).not.toContain(GRANTABLE_PERMISSION)
  })
})

describe('Admin: delete user (DELETE /api/admin/users/[id])', () => {
  it('returns 401 with no token', async () => {
    const res = await fetch(`${BASE}/api/admin/users/whatever`, { method: 'DELETE' })
    expect(res.status).toBe(401)
  })

  it('returns 403 for a regular user', async () => {
    const { accessToken } = await registerAndLogin('admin-del-403')
    const res = await fetch(`${BASE}/api/admin/users/whatever`, {
      method: 'DELETE',
      headers: authHeaders(accessToken),
    })
    expect(res.status).toBe(403)
  })

  it('returns 400 SELF_DELETE when an admin targets their own account', async () => {
    const adminToken = await loginAsAdmin()
    const me = await fetch(`${BASE}/api/auth/me`, { headers: authHeaders(adminToken) })
    const { data } = await me.json()
    const res = await fetch(`${BASE}/api/admin/users/${data.id}`, {
      method: 'DELETE',
      headers: authHeaders(adminToken),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('SELF_DELETE')
  })

  it('returns 404 for an unknown user id', async () => {
    const adminToken = await loginAsAdmin()
    const res = await fetch(`${BASE}/api/admin/users/does-not-exist`, {
      method: 'DELETE',
      headers: authHeaders(adminToken),
    })
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('NOT_FOUND')
  })

  it('deletes a fresh user (200)', async () => {
    const adminToken = await loginAsAdmin()
    const target = await registerAndLogin('admin-del-ok')
    const row = await findUser(adminToken, target.email)
    expect(row).toBeTruthy()

    const res = await fetch(`${BASE}/api/admin/users/${row!.id}`, {
      method: 'DELETE',
      headers: authHeaders(adminToken),
    })
    expect(res.status).toBe(200)
    expect((await res.json()).data.deleted).toBe(true)

    // The user no longer appears in the admin list.
    const after = await findUser(adminToken, target.email)
    expect(after).toBeUndefined()
  })
})
