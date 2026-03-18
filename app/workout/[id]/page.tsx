'use client'

import { useEffect, useState, use } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { z } from 'zod'

interface Exercise {
  id: string
  name: string
  sets: number | null
  reps: number | null
  durationSeconds: number | null
  restSeconds: number | null
  notes: string | null
  order: number
}

interface Day {
  id: string
  dayOfWeek: number
  name: string
  exercises: Exercise[]
}

interface Routine {
  id: string
  name: string
  description: string | null
  days: Day[]
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const addDaySchema = z.object({ name: z.string().min(1, 'Required'), dayOfWeek: z.number() })
const addExSchema = z.object({ name: z.string().min(1, 'Required'), sets: z.coerce.number().int().positive().optional(), reps: z.coerce.number().int().positive().optional() })

export default function RoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProtectedRoute>
      <RoutineDetail routineId={use(params).id} />
    </ProtectedRoute>
  )
}

function RoutineDetail({ routineId }: { routineId: string }) {
  const { fetchWithAuth } = useAuth()
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [loading, setLoading] = useState(true)
  const [addDayOpen, setAddDayOpen] = useState(false)
  const [newDayName, setNewDayName] = useState('')
  const [newDayOfWeek, setNewDayOfWeek] = useState(0)
  const [addExOpen, setAddExOpen] = useState<string | null>(null)
  const [newExName, setNewExName] = useState('')
  const [newExSets, setNewExSets] = useState('')
  const [newExReps, setNewExReps] = useState('')

  useEffect(() => {
    fetchWithAuth(`/api/workout/routines/${routineId}`)
      .then((r) => r.json())
      .then((b) => setRoutine(b.data))
      .finally(() => setLoading(false))
  }, [routineId])

  const addDay = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = addDaySchema.safeParse({ name: newDayName, dayOfWeek: newDayOfWeek })
    if (!parsed.success) return
    const res = await fetchWithAuth(`/api/workout/routines/${routineId}/days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })
    const body = await res.json()
    setRoutine((prev) => prev ? { ...prev, days: [...prev.days, { ...body.data, exercises: [] }] } : prev)
    setNewDayName('')
    setAddDayOpen(false)
  }

  const addExercise = async (dayId: string, e: React.FormEvent) => {
    e.preventDefault()
    const currentDay = routine?.days.find((d) => d.id === dayId)
    const order = currentDay?.exercises.length ?? 0
    const parsed = addExSchema.safeParse({ name: newExName, sets: newExSets || undefined, reps: newExReps || undefined })
    if (!parsed.success) return
    const res = await fetchWithAuth(`/api/workout/days/${dayId}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...parsed.data, order }),
    })
    const body = await res.json()
    setRoutine((prev) => prev ? {
      ...prev,
      days: prev.days.map((d) => d.id === dayId ? { ...d, exercises: [...d.exercises, body.data] } : d),
    } : prev)
    setNewExName('')
    setNewExSets('')
    setNewExReps('')
    setAddExOpen(null)
  }

  const deleteExercise = async (dayId: string, exerciseId: string) => {
    setRoutine((prev) => prev ? {
      ...prev,
      days: prev.days.map((d) => d.id === dayId ? { ...d, exercises: d.exercises.filter((e) => e.id !== exerciseId) } : d),
    } : prev)
    await fetchWithAuth(`/api/workout/exercises/${exerciseId}`, { method: 'DELETE' })
  }

  const reorder = async (dayId: string, exerciseId: string, direction: 'up' | 'down') => {
    const day = routine?.days.find((d) => d.id === dayId)
    if (!day) return
    const idx = day.exercises.findIndex((e) => e.id === exerciseId)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === day.exercises.length - 1) return
    const newExercises = [...day.exercises]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newExercises[idx], newExercises[swapIdx]] = [newExercises[swapIdx], newExercises[idx]]
    setRoutine((prev) => prev ? { ...prev, days: prev.days.map((d) => d.id === dayId ? { ...d, exercises: newExercises } : d) } : prev)
    await fetchWithAuth('/api/workout/exercises/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayId, exerciseIds: newExercises.map((e) => e.id) }),
    })
  }

  if (loading) return <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />)}</div>
  if (!routine) return <div className="p-6 text-gray-500">Routine not found.</div>

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-1">{routine.name}</h1>
      {routine.description && <p className="text-gray-500 mb-6">{routine.description}</p>}

      {routine.days.map((day) => (
        <div key={day.id} className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold">{day.name} <span className="text-xs text-gray-400 ml-1">({DAY_NAMES[day.dayOfWeek]})</span></h2>
            <button onClick={() => setAddExOpen(addExOpen === day.id ? null : day.id)} className="text-blue-600 text-sm flex items-center gap-1">
              <Plus className="h-4 w-4" /> Exercise
            </button>
          </div>

          {addExOpen === day.id && (
            <form onSubmit={(e) => addExercise(day.id, e)} className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-2">
              <input placeholder="Exercise name" value={newExName} onChange={(e) => setNewExName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex gap-2">
                <input placeholder="Sets" type="number" value={newExSets} onChange={(e) => setNewExSets(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input placeholder="Reps" type="number" value={newExReps} onChange={(e) => setNewExReps(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Add</button>
                <button type="button" onClick={() => setAddExOpen(null)} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">Cancel</button>
              </div>
            </form>
          )}

          <ul>
            {day.exercises.length === 0 && <li className="px-4 py-3 text-sm text-gray-400">No exercises yet.</li>}
            {day.exercises.map((ex, idx) => (
              <li key={ex.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => reorder(day.id, ex.id, 'up')} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-20"><ChevronUp className="h-3 w-3" /></button>
                  <button onClick={() => reorder(day.id, ex.id, 'down')} disabled={idx === day.exercises.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-20"><ChevronDown className="h-3 w-3" /></button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{ex.name}</p>
                  <p className="text-xs text-gray-400">
                    {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button onClick={() => deleteExercise(day.id, ex.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {addDayOpen ? (
        <form onSubmit={addDay} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 space-y-3">
          <input placeholder="Day name (e.g. Push Day)" value={newDayName} onChange={(e) => setNewDayName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={newDayOfWeek} onChange={(e) => setNewDayOfWeek(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Add Day</button>
            <button type="button" onClick={() => setAddDayOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAddDayOpen(true)} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 w-full justify-center">
          <Plus className="h-4 w-4" /> Add Day
        </button>
      )}
    </div>
  )
}
