import { z } from 'zod'

export const createRoutineSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().default(false),
})

export const updateRoutineSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().optional(),
})

export const publicFeedSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const createDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  name: z.string().min(1).max(100),
})

export const updateDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  name: z.string().min(1).max(100).optional(),
})

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(200),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  restSeconds: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
  order: z.number().int().min(0),
})

export const updateExerciseSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  restSeconds: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
  order: z.number().int().min(0).optional(),
})

export const reorderExercisesSchema = z.object({
  dayId: z.string().cuid(),
  exerciseIds: z.array(z.string().cuid()),
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})
