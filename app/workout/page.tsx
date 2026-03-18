'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import Link from 'next/link'
import { Plus, Dumbbell, Pencil, Trash2, Check, X, Globe, Lock } from 'lucide-react'
import { z } from 'zod'

interface Routine {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  updatedAt: string
  _count: { days: number }
}

interface PublicRoutine {
  id: string
  name: string
  description: string | null
  createdAt: string
  _count: { days: number }
  user: { name: string }
}

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
})

export default function WorkoutPage() {
  return (
    <ProtectedRoute>
      <WorkoutList />
    </ProtectedRoute>
  )
}

function WorkoutList() {
  const { fetchWithAuth } = useAuth()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [publicRoutines, setPublicRoutines] = useState<PublicRoutine[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPublic, setEditPublic] = useState(false)

  const load = async () => {
    const [myRes, pubRes] = await Promise.all([
      fetchWithAuth('/api/workout/routines'),
      fetch('/api/workout/routines/public?limit=12'),
    ])
    const myBody = await myRes.json()
    const pubBody = await pubRes.json()
    setRoutines(myBody.data?.routines ?? [])
    setPublicRoutines(pubBody.data?.routines ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = createSchema.safeParse({ name, description: description || undefined })
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      for (const err of parsed.error.issues) errs[err.path[0] as string] = err.message
      setErrors(errs)
      return
    }
    setErrors({})
    setSubmitting(true)
    const tempId = `temp-${Date.now()}`
    const optimistic: Routine = { id: tempId, name, description: description || null, isPublic, updatedAt: new Date().toISOString(), _count: { days: 0 } }
    setRoutines((prev) => [optimistic, ...prev])
    setShowForm(false)
    setName('')
    setDescription('')
    setIsPublic(false)
    try {
      const res = await fetchWithAuth('/api/workout/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed.data, isPublic }),
      })
      const body = await res.json()
      setRoutines((prev) => prev.map((r) => (r.id === tempId ? { ...body.data, _count: { days: 0 } } : r)))
    } catch {
      setRoutines((prev) => prev.filter((r) => r.id !== tempId))
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (r: Routine) => {
    setEditId(r.id)
    setEditName(r.name)
    setEditDesc(r.description ?? '')
    setEditPublic(r.isPublic)
  }

  const saveEdit = async (id: string) => {
    const parsed = createSchema.safeParse({ name: editName, description: editDesc || undefined })
    if (!parsed.success) return
    setRoutines((prev) => prev.map((r) => r.id === id ? { ...r, name: editName, description: editDesc || null, isPublic: editPublic } : r))
    setEditId(null)
    await fetchWithAuth(`/api/workout/routines/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...parsed.data, isPublic: editPublic }),
    })
  }

  const deleteRoutine = async (id: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== id))
    await fetchWithAuth(`/api/workout/routines/${id}`, { method: 'DELETE' })
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Routines</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          New Routine
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 space-y-3">
          <div>
            <input
              placeholder="Routine name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="rounded accent-blue-600" />
            <Globe className="h-3.5 w-3.5 text-gray-400" />
            Make public
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm">
              Create
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : routines.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No routines yet. Create one to get started.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {routines.map((r) => (
            <li key={r.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
              {editId === r.id ? (
                <div className="p-4 space-y-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input type="checkbox" checked={editPublic} onChange={(e) => setEditPublic(e.target.checked)} className="rounded accent-blue-600" />
                    <Globe className="h-3.5 w-3.5 text-gray-400" />
                    Make public
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(r.id)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm"><Check className="h-3 w-3" /> Save</button>
                    <button onClick={() => setEditId(null)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm"><X className="h-3 w-3" /> Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4">
                  <Link href={`/workout/${r.id}`} className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{r.name}</p>
                    {r.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{r.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">{r._count.days} day{r._count.days !== 1 ? 's' : ''}</p>
                  </Link>
                  {r.isPublic
                    ? <Globe className="h-3.5 w-3.5 text-blue-400 shrink-0" aria-label="Public" />
                    : <Lock className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 shrink-0" aria-label="Private" />
                  }
                  <button onClick={() => startEdit(r)} className="text-gray-400 hover:text-blue-600 p-1"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => deleteRoutine(r.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Community feed */}
      {publicRoutines.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" /> Community Routines
          </h2>
          <ul className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {publicRoutines.map((r) => (
              <li key={r.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <p className="font-semibold">{r.name}</p>
                {r.description && <p className="text-sm text-gray-500 mt-0.5">{r.description}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {r._count.days} day{r._count.days !== 1 ? 's' : ''} · by {r.user.name}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
