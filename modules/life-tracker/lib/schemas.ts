import { z } from 'zod'

export const trackerTypeEnum = z.enum(['DESIRE', 'EMOTION', 'GOAL', 'ACHIEVEMENT'])

export const createEntrySchema = z.object({
  type: trackerTypeEnum,
  title: z.string().min(1).max(200),
  content: z.string().max(2000).optional(),
  score: z.number().int().min(1).max(10),
  tags: z.array(z.string().max(50)).max(20).default([]),
})

export const updateEntrySchema = z.object({
  type: trackerTypeEnum.optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(2000).optional(),
  score: z.number().int().min(1).max(10).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export const listEntriesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: trackerTypeEnum.optional(),
})
