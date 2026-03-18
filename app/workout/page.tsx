'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import Link from 'next/link'
import { Plus, Dumbbell } from 'lucide-react'
import { z } from 'zod'

interface Routine {
  id: string
  name: string
  description: string | null
  updatedAt: string
  _count: { days: number }
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
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    const res = await fetchWithAuth('/api/workout/routines')
    const body = await res.json()
    setRoutines(body.data?.routines ?? [])
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

    // Optimistic
    const tempId = `temp-${Date.now()}`
    const optimistic: Routine = { id: tempId, name, description: description || null, updatedAt: new Date().toISOString(), _count: { days: 0 } }
    setRoutines((prev) => [optimistic, ...prev])
    setShowForm(false)
    setName('')
    setDescription('')

    try {
      const res = await fetchWithAuth('/api/workout/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      const body = await res.json()
      setRoutines((prev) => prev.map((r) => (r.id === tempId ? { ...body.data, _count: { days: 0 } } : r)))
    } catch {
      setRoutines((prev) => prev.filter((r) => r.id !== tempId))
    } finally {
      setSubmitting(false)
    }
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
            <li key={r.id}>
              <Link
                href={`/workout/${r.id}`}
                className="block p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow"
              >
                <p className="font-semibold">{r.name}</p>
                {r.description && <p className="text-sm text-gray-500 mt-1 truncate">{r.description}</p>}
                <p className="text-xs text-gray-400 mt-2">{r._count.days} day{r._count.days !== 1 ? 's' : ''}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
