'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { useRouter } from 'next/navigation'

interface AdminUser {
  id: string
  email: string
  name: string
  roles: string[]
}

const ROLES = ['user', 'moderator', 'admin', 'master_admin']

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminGuard />
    </ProtectedRoute>
  )
}

function AdminGuard() {
  const { user } = useAuth()
  const router = useRouter()

  const isAdmin = user?.roles.some((r) => ['master_admin', 'admin'].includes(r))

  useEffect(() => {
    if (user && !isAdmin) router.replace('/')
  }, [user, isAdmin, router])

  if (!isAdmin) return null
  return <AdminPanel />
}

function AdminPanel() {
  const { fetchWithAuth } = useAuth()
  const { t } = useLocale()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWithAuth('/api/admin/users')
      .then((r) => r.json())
      .then((b) => setUsers(b.data?.users ?? []))
      .finally(() => setLoading(false))
  }, [fetchWithAuth])

  const assignRole = async (userId: string, role: string) => {
    await fetchWithAuth('/api/admin/users/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, roles: Array.from(new Set([...u.roles, role])) } : u
      )
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">{t('admin.title')}</h1>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">{t('admin.user')}</th>
                <th className="px-4 py-3 text-left">{t('admin.roles')}</th>
                <th className="px-4 py-3 text-left">{t('admin.assignRole')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-gray-400 text-xs">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-xs">{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      defaultValue=""
                      onChange={(e) => { if (e.target.value) assignRole(u.id, e.target.value) }}
                      className="text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    >
                      <option value="">{t('admin.addRole')}</option>
                      {ROLES.filter((r) => !u.roles.includes(r)).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
