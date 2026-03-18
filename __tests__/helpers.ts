import { expect } from 'vitest'

export const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/** Unique email per test run to avoid conflicts on repeated runs */
export const uniqueEmail = (prefix: string) =>
  `${prefix}.${Date.now()}@smoke.invalid`

export async function register(email: string, password = 'Smoke!Test99', name = 'Test User') {
  return fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
}

export async function login(email: string, password = 'Smoke!Test99') {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await res.json()
  return { res, accessToken: body.data?.accessToken as string, refreshToken: body.data?.refreshToken as string }
}

export async function registerAndLogin(prefix: string) {
  const email = uniqueEmail(prefix)
  const password = 'Smoke!Test99'
  await register(email, password)
  const { accessToken, refreshToken } = await login(email, password)
  return { email, password, accessToken, refreshToken }
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}
