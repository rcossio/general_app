import { describe, it, expect } from 'vitest'
import { BASE, registerAndLogin, authHeaders } from './helpers'

async function createRoutine(accessToken: string, name = 'Test Routine') {
  const res = await fetch(`${BASE}/api/workout/routines`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ name }),
  })
  const body = await res.json()
  return { res, id: body.data?.id as string }
}

async function createDay(accessToken: string, routineId: string) {
  const res = await fetch(`${BASE}/api/workout/routines/${routineId}/days`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ dayOfWeek: 1, name: 'Monday' }),
  })
  const body = await res.json()
  return { res, id: body.data?.id as string }
}

async function createExercise(accessToken: string, dayId: string) {
  const res = await fetch(`${BASE}/api/workout/days/${dayId}/exercises`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ name: 'Push Up', sets: 3, reps: 10, order: 0 }),
  })
  const body = await res.json()
  return { res, id: body.data?.id as string }
}

describe('Workout: Public Feed', () => {
  it('public endpoint requires no auth and returns only public routines', async () => {
    const { accessToken } = await registerAndLogin('wk-pub-setup')

    // Create a private and a public routine
    const privRes = await fetch(`${BASE}/api/workout/routines`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ name: 'Private Routine', isPublic: false }),
    })
    const privBody = await privRes.json()
    const privId = privBody.data?.id as string

    const pubRes = await fetch(`${BASE}/api/workout/routines`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ name: 'Public Routine', isPublic: true }),
    })
    const pubBody = await pubRes.json()
    const pubId = pubBody.data?.id as string

    // Hit public endpoint with no auth
    const feedRes = await fetch(`${BASE}/api/workout/routines/public`)
    expect(feedRes.status).toBe(200)
    const feedBody = await feedRes.json()
    const names = feedBody.data.routines.map((r: { name: string }) => r.name)
    expect(names).toContain('Public Routine')
    expect(names).not.toContain('Private Routine')

    // Each entry includes author name
    const pub = feedBody.data.routines.find((r: { name: string }) => r.name === 'Public Routine')
    expect(pub.user).toHaveProperty('name')

    await fetch(`${BASE}/api/workout/routines/${privId}`, { method: 'DELETE', headers: authHeaders(accessToken) })
    await fetch(`${BASE}/api/workout/routines/${pubId}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })

  it('toggling isPublic via PUT updates visibility in feed', async () => {
    const { accessToken } = await registerAndLogin('wk-pub-toggle')
    const { id } = await createRoutine(accessToken, 'Toggle Routine')

    // Not in public feed yet
    const before = await fetch(`${BASE}/api/workout/routines/public`)
    const beforeBody = await before.json()
    const namesBefore = beforeBody.data.routines.map((r: { name: string }) => r.name)
    expect(namesBefore).not.toContain('Toggle Routine')

    // Make public
    await fetch(`${BASE}/api/workout/routines/${id}`, {
      method: 'PUT',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ isPublic: true }),
    })

    const after = await fetch(`${BASE}/api/workout/routines/public`)
    const afterBody = await after.json()
    const namesAfter = afterBody.data.routines.map((r: { name: string }) => r.name)
    expect(namesAfter).toContain('Toggle Routine')

    await fetch(`${BASE}/api/workout/routines/${id}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })
})

describe('Workout: Routines', () => {
  it('returns paginated routines', async () => {
    const { accessToken } = await registerAndLogin('wk-list')
    const res = await fetch(`${BASE}/api/workout/routines`, { headers: authHeaders(accessToken) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveProperty('routines')
  })

  it('creates a routine', async () => {
    const { accessToken } = await registerAndLogin('wk-create')
    const { res, id } = await createRoutine(accessToken)
    expect(res.status).toBe(201)
    expect(id).toBeTruthy()
    await fetch(`${BASE}/api/workout/routines/${id}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })

  it('reads a routine by id', async () => {
    const { accessToken } = await registerAndLogin('wk-read')
    const { id } = await createRoutine(accessToken)
    const res = await fetch(`${BASE}/api/workout/routines/${id}`, { headers: authHeaders(accessToken) })
    expect(res.status).toBe(200)
    await fetch(`${BASE}/api/workout/routines/${id}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })

  it('updates a routine', async () => {
    const { accessToken } = await registerAndLogin('wk-update')
    const { id } = await createRoutine(accessToken)
    const res = await fetch(`${BASE}/api/workout/routines/${id}`, {
      method: 'PUT',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ name: 'Updated' }),
    })
    expect(res.status).toBe(200)
    await fetch(`${BASE}/api/workout/routines/${id}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })

  it('deletes a routine', async () => {
    const { accessToken } = await registerAndLogin('wk-delete')
    const { id } = await createRoutine(accessToken)
    const res = await fetch(`${BASE}/api/workout/routines/${id}`, {
      method: 'DELETE',
      headers: authHeaders(accessToken),
    })
    expect(res.status).toBe(200)
  })

  it('cannot read another user\'s routine (404)', async () => {
    const user1 = await registerAndLogin('wk-owner')
    const user2 = await registerAndLogin('wk-other')
    const { id } = await createRoutine(user1.accessToken)
    const res = await fetch(`${BASE}/api/workout/routines/${id}`, { headers: authHeaders(user2.accessToken) })
    expect(res.status).toBe(404)
    await fetch(`${BASE}/api/workout/routines/${id}`, { method: 'DELETE', headers: authHeaders(user1.accessToken) })
  })
})

describe('Workout: Days', () => {
  it('creates a day in a routine', async () => {
    const { accessToken } = await registerAndLogin('wk-day-create')
    const { id: routineId } = await createRoutine(accessToken)
    const { res } = await createDay(accessToken, routineId)
    expect(res.status).toBe(201)
    await fetch(`${BASE}/api/workout/routines/${routineId}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })

  it('updates a day', async () => {
    const { accessToken } = await registerAndLogin('wk-day-update')
    const { id: routineId } = await createRoutine(accessToken)
    const { id: dayId } = await createDay(accessToken, routineId)
    const res = await fetch(`${BASE}/api/workout/days/${dayId}`, {
      method: 'PUT',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ name: 'Tuesday' }),
    })
    expect(res.status).toBe(200)
    await fetch(`${BASE}/api/workout/routines/${routineId}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })

  it('deletes a day', async () => {
    const { accessToken } = await registerAndLogin('wk-day-delete')
    const { id: routineId } = await createRoutine(accessToken)
    const { id: dayId } = await createDay(accessToken, routineId)
    const res = await fetch(`${BASE}/api/workout/days/${dayId}`, {
      method: 'DELETE',
      headers: authHeaders(accessToken),
    })
    expect(res.status).toBe(200)
    await fetch(`${BASE}/api/workout/routines/${routineId}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })
})

describe('Workout: Exercises', () => {
  it('creates an exercise in a day', async () => {
    const { accessToken } = await registerAndLogin('wk-ex-create')
    const { id: routineId } = await createRoutine(accessToken)
    const { id: dayId } = await createDay(accessToken, routineId)
    const { res } = await createExercise(accessToken, dayId)
    expect(res.status).toBe(201)
    await fetch(`${BASE}/api/workout/routines/${routineId}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })

  it('updates an exercise', async () => {
    const { accessToken } = await registerAndLogin('wk-ex-update')
    const { id: routineId } = await createRoutine(accessToken)
    const { id: dayId } = await createDay(accessToken, routineId)
    const { id: exId } = await createExercise(accessToken, dayId)
    const res = await fetch(`${BASE}/api/workout/exercises/${exId}`, {
      method: 'PUT',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ name: 'Pull Up', sets: 4, reps: 8 }),
    })
    expect(res.status).toBe(200)
    await fetch(`${BASE}/api/workout/routines/${routineId}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })

  it('reorders exercises', async () => {
    const { accessToken } = await registerAndLogin('wk-ex-reorder')
    const { id: routineId } = await createRoutine(accessToken)
    const { id: dayId } = await createDay(accessToken, routineId)
    const { id: ex1 } = await createExercise(accessToken, dayId)
    const ex2Res = await fetch(`${BASE}/api/workout/days/${dayId}/exercises`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ name: 'Squat', sets: 3, reps: 12, order: 1 }),
    })
    const ex2Body = await ex2Res.json()
    const ex2 = ex2Body.data?.id as string

    const res = await fetch(`${BASE}/api/workout/exercises/reorder`, {
      method: 'PATCH',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ dayId, exerciseIds: [ex2, ex1] }),
    })
    expect(res.status).toBe(200)
    await fetch(`${BASE}/api/workout/routines/${routineId}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })

  it('deletes an exercise', async () => {
    const { accessToken } = await registerAndLogin('wk-ex-delete')
    const { id: routineId } = await createRoutine(accessToken)
    const { id: dayId } = await createDay(accessToken, routineId)
    const { id: exId } = await createExercise(accessToken, dayId)
    const res = await fetch(`${BASE}/api/workout/exercises/${exId}`, {
      method: 'DELETE',
      headers: authHeaders(accessToken),
    })
    expect(res.status).toBe(200)
    await fetch(`${BASE}/api/workout/routines/${routineId}`, { method: 'DELETE', headers: authHeaders(accessToken) })
  })
})
