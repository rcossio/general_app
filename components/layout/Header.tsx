'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Moon, Sun, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'

export function Header() {
  const { user, logout } = useAuth()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 md:hidden">
      <span className="font-semibold text-gray-900 dark:text-white">Platform</span>
      <div className="flex items-center gap-2">
        <button onClick={toggleTheme} className="p-2 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        {user && (
          <button onClick={logout} className="p-2 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>
    </header>
  )
}
