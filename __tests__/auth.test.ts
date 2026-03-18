import { describe, it, expect } from 'vitest'
import { BASE, register, login, registerAndLogin, uniqueEmail, authHeaders } from './helpers'

describe('Auth: Register', () => {
  it('returns 201 and tokens on successful registration', async () => {
    const res = await register(uniqueEmail('reg'))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.accessToken).toBeTruthy()
    expect(body.data.refreshToken).toBeTruthy()
  })

  it('returns 400 when email is already taken', async () => {
    const email = uniqueEmail('dup')
    await register(email)
    const res = await register(email)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('EMAIL_EXISTS')
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'notvalid' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('Auth: Login', () => {
  it('returns tokens with correct credentials', async () => {
    const email = uniqueEmail('login')
    await register(email)
    const { res, accessToken, refreshToken } = await login(email)
    expect(res.status).toBe(200)
    expect(accessToken).toBeTruthy()
    expect(refreshToken).toBeTruthy()
  })

  it('returns 401 with wrong password', async () => {
    const email = uniqueEmail('wrongpass')
    await register(email)
    const { res } = await login(email, 'WrongPassword!')
    expect(res.status).toBe(401)
  })

  it('returns 401 for unknown email', async () => {
    const { res } = await login(uniqueEmail('ghost'))
    expect(res.status).toBe(401)
  })
})

describe('Auth: Refresh', () => {
  it('returns a new token pair with a valid refresh token', async () => {
    const { refreshToken } = await registerAndLogin('refresh')
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.accessToken).toBeTruthy()
    expect(body.data.refreshToken).not.toBe(refreshToken)
  })

  it('returns 401 when a rotated (used) refresh token is reused', async () => {
    const { refreshToken } = await registerAndLogin('rotate')
    // Use the token once
    await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    // Use again — must fail
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    expect(res.status).toBe(401)
  })
})

describe('Auth: Logout', () => {
  it('revokes the refresh token so it cannot be reused', async () => {
    const { accessToken, refreshToken } = await registerAndLogin('logout')
    await fetch(`${BASE}/api/auth/logout`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ refreshToken }),
    })
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    expect(res.status).toBe(401)
  })
})

describe('Auth: Me', () => {
  it('returns 401 with no token', async () => {
    const res = await fetch(`${BASE}/api/auth/me`)
    expect(res.status).toBe(401)
  })

  it('returns 401 with an invalid token', async () => {
    const res = await fetch(`${BASE}/api/auth/me`, {
      headers: { Authorization: 'Bearer bad.token.here' },
    })
    expect(res.status).toBe(401)
  })

  it('returns user data with a valid token', async () => {
    const { email, accessToken } = await registerAndLogin('me')
    const res = await fetch(`${BASE}/api/auth/me`, { headers: authHeaders(accessToken) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.email).toBe(email)
  })
})
