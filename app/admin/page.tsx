'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, ChevronDown, Trash2 } from 'lucide-react'

interface AdminUser {
  id: string
  email: string
  name: string
  roles: string[]
}

const ROLES = ['user', 'moderator', 'admin', 'master_admin', 'bot_user']

function roleBadgeClass(role: string): string {
  switch (role) {
    case 'master_admin': return 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
    case 'admin': return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
    case 'bot_user': return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
    default: return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
  }
}

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
  const { user, fetchWithAuth } = useAuth()
  const { t } = useLocale()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const limit = 20

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (roleFilter) params.set('role', roleFilter)
    params.set('page', String(page))
    params.set('limit', String(limit))
    const res = await fetchWithAuth(`/api/admin/users?${params}`)
    const body = await res.json()
    setUsers(body.data?.users ?? [])
    setTotal(body.data?.total ?? 0)
    setLoading(false)
  }, [fetchWithAuth, search, roleFilter, page])

  useEffect(() => { loadUsers() }, [loadUsers])
  useEffect(() => { setPage(1) }, [search, roleFilter])

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

  const handleExpand = (userId: string) => {
    setExpandedId((prev) => prev === userId ? null : userId)
    setDeleteConfirmInput('')
  }

  const handleDelete = async (u: AdminUser) => {
    setDeleting(true)
    try {
      await fetchWithAuth(`/api/admin/users/${u.id}`, { method: 'DELETE' })
      setExpandedId(null)
      setDeleteConfirmInput('')
      await loadUsers()
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">{t('admin.title')}</h1>

      {/* Search + role filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
        >
          <option value="">{t('admin.allRoles')}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        {t('admin.totalUsers', { count: String(total) })}
      </p>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">{t('admin.noUsersFound')}</p>
      ) : (
        <>
          <ul className="space-y-2">
            {users.map((u) => {
              const isExpanded = expandedId === u.id
              const isSelf = u.id === user?.id
              return (
                <li key={u.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                  {/* User row */}
                  <button
                    onClick={() => handleExpand(u.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{u.name}</p>
                      <p className="text-gray-400 text-xs truncate">{u.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 shrink-0">
                      {u.roles.map((r) => (
                        <span key={r} className={`px-2 py-0.5 rounded-full text-xs ${roleBadgeClass(r)}`}>{r}</span>
                      ))}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded actions */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800 space-y-4">
                      {/* Assign role */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{t('admin.assignRole')}:</span>
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
                      </div>

                      {/* Delete user */}
                      {isSelf ? (
                        <p className="text-xs text-gray-400 italic">{t('admin.cannotDeleteSelf')}</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500">
                            {t('admin.deleteUserConfirm', { name: u.name })}
                          </p>
                          <p className="text-xs text-red-500">{t('admin.deleteUserWarning')}</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={deleteConfirmInput}
                              onChange={(e) => setDeleteConfirmInput(e.target.value)}
                              placeholder={u.name}
                              className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <button
                              onClick={() => handleDelete(u)}
                              disabled={deleteConfirmInput !== u.name || deleting}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:hover:bg-red-600 text-white text-sm font-medium transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t('admin.deleteUser')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
