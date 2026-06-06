'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useChrome } from '@/contexts/ChromeContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Moon, Sun, LogOut } from 'lucide-react'

export function Header() {
  const { user, logout } = useAuth()
  const { hideChrome } = useChrome()
  const { isDark, setMode } = useTheme()

  if (hideChrome) return null

  const toggleTheme = () => setMode(isDark ? 'light' : 'dark')

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-brand-green md:hidden">
      <a href="/" className="font-rubik font-extrabold text-white text-[26px]">vysi</a>
      <div className="flex items-center gap-2">
        <button onClick={toggleTheme} className="p-2 rounded text-white/70 hover:text-white hover:bg-white/10">
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        {user && (
          <button onClick={logout} className="p-2 rounded text-white/70 hover:text-white hover:bg-white/10">
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>
    </header>
  )
}
