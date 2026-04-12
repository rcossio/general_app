'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return mode === 'dark'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system')
  const [isDark, setIsDark] = useState(false)

  const applyTheme = useCallback((m: ThemeMode) => {
    const dark = resolveIsDark(m)
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    const initial: ThemeMode = stored === 'light' || stored === 'dark' ? stored : 'system'
    setModeState(initial)
    applyTheme(initial)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const current = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? 'system'
      if (current === 'system') applyTheme('system')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [applyTheme])

  const setMode = (m: ThemeMode) => {
    setModeState(m)
    if (m === 'system') {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, m)
    }
    applyTheme(m)
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
