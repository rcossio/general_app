'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Check, X } from 'lucide-react'
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

export default function RoutineDetailPage() {
  const params = useParams<{ id: string }>()
  return (
    <ProtectedRoute>
      <RoutineDetail routineId={params.id} />
    </ProtectedRoute>
  )
}

function RoutineDetail({ routineId }: { routineId: string }) {
  const { fetchWithAuth } = useAuth()
  const router = useRouter()
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [loading, setLoading] = useState(true)

  // Routine editing
  const [editRoutine, setEditRoutine] = useState(false)
  const [editRoutineName, setEditRoutineName] = useState('')
  const [editRoutineDesc, setEditRoutineDesc] = useState('')

  // Day adding
  const [addDayOpen, setAddDayOpen] = useState(false)
  const [newDayName, setNewDayName] = useState('')
  const [newDayOfWeek, setNewDayOfWeek] = useState(0)

  // Day editing
  const [editDayId, setEditDayId] = useState<string | null>(null)
  const [editDayName, setEditDayName] = useState('')
  const [editDayOfWeek, setEditDayOfWeek] = useState(0)

  // Exercise adding
  const [addExOpen, setAddExOpen] = useState<string | null>(null)
  const [newExName, setNewExName] = useState('')
  const [newExSets, setNewExSets] = useState('')
  const [newExReps, setNewExReps] = useState('')

  // Exercise editing
  const [editExId, setEditExId] = useState<string | null>(null)
  const [editExName, setEditExName] = useState('')
  const [editExSets, setEditExSets] = useState('')
  const [editExReps, setEditExReps] = useState('')

  useEffect(() => {
    fetchWithAuth(`/api/workout/routines/${routineId}`)
      .then((r) => r.json())
      .then((b) => setRoutine(b.data))
      .finally(() => setLoading(false))
  }, [routineId])

  const saveRoutine = async () => {
    if (!editRoutineName.trim()) return
    setRoutine((prev) => prev ? { ...prev, name: editRoutineName, description: editRoutineDesc || null } : prev)
    setEditRoutine(false)
    await fetchWithAuth(`/api/workout/routines/${routineId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editRoutineName, description: editRoutineDesc || undefined }),
    })
  }

  const deleteRoutine = async () => {
    await fetchWithAuth(`/api/workout/routines/${routineId}`, { method: 'DELETE' })
    router.push('/workout')
  }

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

  const startEditDay = (day: Day) => {
    setEditDayId(day.id)
    setEditDayName(day.name)
    setEditDayOfWeek(day.dayOfWeek)
  }

  const saveDay = async (dayId: string) => {
    if (!editDayName.trim()) return
    setRoutine((prev) => prev ? {
      ...prev,
      days: prev.days.map((d) => d.id === dayId ? { ...d, name: editDayName, dayOfWeek: editDayOfWeek } : d),
    } : prev)
    setEditDayId(null)
    await fetchWithAuth(`/api/workout/days/${dayId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editDayName, dayOfWeek: editDayOfWeek }),
    })
  }

  const deleteDay = async (dayId: string) => {
    setRoutine((prev) => prev ? { ...prev, days: prev.days.filter((d) => d.id !== dayId) } : prev)
    await fetchWithAuth(`/api/workout/days/${dayId}`, { method: 'DELETE' })
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

  const startEditEx = (ex: Exercise) => {
    setEditExId(ex.id)
    setEditExName(ex.name)
    setEditExSets(ex.sets?.toString() ?? '')
    setEditExReps(ex.reps?.toString() ?? '')
  }

  const saveEx = async (dayId: string, exId: string) => {
    const parsed = addExSchema.safeParse({ name: editExName, sets: editExSets || undefined, reps: editExReps || undefined })
    if (!parsed.success) return
    setRoutine((prev) => prev ? {
      ...prev,
      days: prev.days.map((d) => d.id === dayId ? {
        ...d,
        exercises: d.exercises.map((ex) => ex.id === exId ? { ...ex, name: editExName, sets: parsed.data.sets ?? null, reps: parsed.data.reps ?? null } : ex),
      } : d),
    } : prev)
    setEditExId(null)
    await fetchWithAuth(`/api/workout/exercises/${exId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })
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
      {/* Routine header */}
      {editRoutine ? (
        <div className="mb-6 space-y-2">
          <input
            value={editRoutineName}
            onChange={(e) => setEditRoutineName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={editRoutineDesc}
            onChange={(e) => setEditRoutineDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button onClick={saveRoutine} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm"><Check className="h-3 w-3" /> Save</button>
            <button onClick={() => setEditRoutine(false)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm"><X className="h-3 w-3" /> Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between mb-6 gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{routine.name}</h1>
            {routine.description && <p className="text-gray-500 mt-1">{routine.description}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => { setEditRoutineName(routine.name); setEditRoutineDesc(routine.description ?? ''); setEditRoutine(true) }} className="p-2 text-gray-400 hover:text-blue-600"><Pencil className="h-4 w-4" /></button>
            <button onClick={deleteRoutine} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {routine.days.map((day) => (
        <div key={day.id} className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          {/* Day header */}
          {editDayId === day.id ? (
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <input
                value={editDayName}
                onChange={(e) => setEditDayName(e.target.value)}
                className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={editDayOfWeek}
                onChange={(e) => setEditDayOfWeek(Number(e.target.value))}
                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none"
              >
                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <button onClick={() => saveDay(day.id)} className="p-1 text-blue-600 hover:text-blue-800"><Check className="h-4 w-4" /></button>
              <button onClick={() => setEditDayId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold">{day.name} <span className="text-xs text-gray-400 ml-1">({DAY_NAMES[day.dayOfWeek]})</span></h2>
              <div className="flex items-center gap-1">
                <button onClick={() => startEditDay(day)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => deleteDay(day.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                <button onClick={() => setAddExOpen(addExOpen === day.id ? null : day.id)} className="text-blue-600 text-sm flex items-center gap-1 ml-2">
                  <Plus className="h-4 w-4" /> Exercise
                </button>
              </div>
            </div>
          )}

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
              <li key={ex.id} className="border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                {editExId === ex.id ? (
                  <div className="flex items-center gap-2 px-4 py-2">
                    <input value={editExName} onChange={(e) => setEditExName(e.target.value)}
                      className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input placeholder="Sets" type="number" value={editExSets} onChange={(e) => setEditExSets(e.target.value)}
                      className="w-16 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none" />
                    <input placeholder="Reps" type="number" value={editExReps} onChange={(e) => setEditExReps(e.target.value)}
                      className="w-16 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none" />
                    <button onClick={() => saveEx(day.id, ex.id)} className="p-1 text-blue-600 hover:text-blue-800"><Check className="h-4 w-4" /></button>
                    <button onClick={() => setEditExId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
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
                    <button onClick={() => startEditEx(ex)} className="text-gray-400 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => deleteExercise(day.id, ex.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
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
