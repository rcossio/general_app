'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

interface User {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  privacyAcceptedAt: string | null
  roles: string[]
  permissions: string[]
}

interface AuthContextValue {
  user: User | null
  accessToken: string | null
  loading: boolean
  login: (email: string, password: string, privacyAccepted?: boolean) => Promise<{ isNewUser?: boolean }>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshing = useRef(false)

  const refresh = useCallback(async (): Promise<string | null> => {
    if (refreshing.current) return null
    refreshing.current = true
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      if (!res.ok) {
        setUser(null)
        setAccessToken(null)
        return null
      }
      const body = await res.json()
      setAccessToken(body.data.accessToken)
      return body.data.accessToken
    } finally {
      refreshing.current = false
    }
  }, [])

  const fetchMe = useCallback(async (token: string) => {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const body = await res.json()
      setUser(body.data)
    }
  }, [])

  useEffect(() => {
    refresh()
      .then((token) => { if (token) return fetchMe(token) })
      .finally(() => setLoading(false))
  }, [refresh, fetchMe])

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const token = accessToken
      const res = await fetch(url, {
        ...options,
        headers: { ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
      })
      if (res.status === 401) {
        const newToken = await refresh()
        if (newToken) {
          return fetch(url, {
            ...options,
            headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
            credentials: 'include',
          })
        }
      }
      return res
    },
    [accessToken, refresh]
  )

  const login = useCallback(async (email: string, password: string, privacyAccepted?: boolean) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, ...(privacyAccepted !== undefined && { privacyAccepted }) }),
      credentials: 'include',
    })
    if (!res.ok) {
      const body = await res.json()
      throw new Error(body.error ?? 'Login failed')
    }
    const body = await res.json()
    setAccessToken(body.data.accessToken)
    await fetchMe(body.data.accessToken)
    return body.data as { isNewUser?: boolean }
  }, [fetchMe])

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
      credentials: 'include',
    })
    if (!res.ok) {
      const body = await res.json()
      throw new Error(body.error ?? 'Registration failed')
    }
    const body = await res.json()
    setAccessToken(body.data.accessToken)
    await fetchMe(body.data.accessToken)
  }, [fetchMe])

  const refreshUser = useCallback(async () => {
    if (accessToken) await fetchMe(accessToken)
  }, [accessToken, fetchMe])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
    setAccessToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, register, logout, refreshUser, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
