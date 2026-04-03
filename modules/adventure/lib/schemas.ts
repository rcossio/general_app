import { z } from 'zod'

export const startSessionSchema = z.object({
  gameId: z.string().min(1),
})

export const visitLocationSchema = z.object({
  locationId: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  choiceId: z.string().optional(),
  password: z.string().optional(),
})

export const closeLocationSchema = z.object({
  locationId: z.string().min(1),
})

export const createGameSchema = z.object({
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, numbers and hyphens'),
  title: z.record(z.string(), z.string().min(1).max(200)),
  description: z.string().max(1000).optional(),
  chapter: z.number().int().positive().default(1),
  nextGameSlug: z.string().optional(),
})
