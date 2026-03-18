import { describe, it, expect } from 'vitest'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'
import { signAccessToken, signRefreshToken, storeRefreshToken, hashToken } from '../lib/auth'

// Helper to make requests with the app base URL
const BASE = 'http://localhost:3000'

async function registerUser(email = 'test@example.com', password = 'password123', name = 'Test User') {
  const response = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  return response
}

describe('Auth: Register', () => {
  it('creates user with hashed password — plain password never stored', async () => {
    const password = 'mypassword123'
    const response = await registerUser('hash@test.com', password)
    expect(response.status).toBe(201)

    const user = await prisma.user.findUnique({ where: { email: 'hash@test.com' } })
    expect(user).toBeTruthy()
    expect(user!.passwordHash).not.toBe(password)
    const valid = await bcrypt.compare(password, user!.passwordHash)
    expect(valid).toBe(true)
  })

  it('returns valid access and refresh tokens on register', async () => {
    const response = await registerUser()
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.data.accessToken).toBeTruthy()
    expect(body.data.refreshToken).toBeTruthy()
  })
})

describe('Auth: Login', () => {
  it('returns valid tokens with correct credentials', async () => {
    await registerUser('login@test.com', 'correctpass')

    const response = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@test.com', password: 'correctpass' }),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.accessToken).toBeTruthy()
    expect(body.data.refreshToken).toBeTruthy()
  })

  it('returns 401 with wrong password', async () => {
    await registerUser('wrong@test.com', 'correctpass')

    const response = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'wrong@test.com', password: 'wrongpass' }),
    })
    expect(response.status).toBe(401)
  })
})

describe('Auth: Refresh', () => {
  it('returns new token pair with valid refresh token', async () => {
    const reg = await registerUser('refresh@test.com', 'password123')
    const regBody = await reg.json()
    const refreshToken = regBody.data.refreshToken

    const response = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.accessToken).toBeTruthy()
    expect(body.data.refreshToken).toBeTruthy()
    expect(body.data.refreshToken).not.toBe(refreshToken)
  })

  it('returns 401 with revoked refresh token', async () => {
    const reg = await registerUser('revoked@test.com', 'password123')
    const regBody = await reg.json()
    const refreshToken = regBody.data.refreshToken

    // Use once (rotates)
    await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    // Use again — should fail
    const response = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    expect(response.status).toBe(401)
  })
})

describe('Auth: Logout', () => {
  it('marks the refresh token as revoked', async () => {
    const reg = await registerUser('logout@test.com', 'password123')
    const regBody = await reg.json()
    const refreshToken = regBody.data.refreshToken

    await fetch(`${BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    const tokenHash = hashToken(refreshToken)
    const stored = await prisma.refreshToken.findFirst({ where: { tokenHash } })
    expect(stored?.revoked).toBe(true)
  })
})

describe('Auth: Me', () => {
  it('returns 401 with expired/invalid access token', async () => {
    const response = await fetch(`${BASE}/api/auth/me`, {
      headers: { Authorization: 'Bearer invalid.token.here' },
    })
    expect(response.status).toBe(401)
  })

  it('returns user data with valid access token', async () => {
    const reg = await registerUser('me@test.com', 'password123')
    const regBody = await reg.json()

    const response = await fetch(`${BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${regBody.data.accessToken}` },
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.email).toBe('me@test.com')
  })
})
