import { z } from 'zod'
import { EVENT_TYPE_KEYS } from './categories'

const tiptapDoc = z.object({ type: z.literal('doc') }).passthrough()

export const MAX_EVENT_IMAGES = 10

// Weekly publishing cap for non-admins without events:unlimited (rolling 7 days).
export const WEEKLY_EVENT_MAX = 1
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Create/update payload for an event. Dates arrive as ISO strings from the
// client and are coerced to Date. endAt is optional; when present it must be
// >= startAt.
export const eventSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    type: z.enum(EVENT_TYPE_KEYS as [string, ...string[]]),
    content: tiptapDoc,
    images: z.array(z.string().min(1).max(300)).max(MAX_EVENT_IMAGES).default([]),
    startAt: z.coerce.date(),
    endAt: z.coerce.date().nullish(),
    locationLabel: z.string().trim().max(200).optional(),
    lat: z.number().min(-90).max(90).nullish(),
    lng: z.number().min(-180).max(180).nullish(),
  })
  .refine((d) => !d.endAt || d.endAt >= d.startAt, {
    message: 'End must be after start',
    path: ['endAt'],
  })

export const quotaRequestSchema = z.object({
  message: z.string().trim().max(500).optional(),
})

export type EventInput = z.infer<typeof eventSchema>

// Image keys are minted only by the upload-url endpoint as events/<uuid>.jpg.
const EVENT_IMAGE_KEY_RE = /^events\/[0-9a-f-]+\.(jpg|webp)$/

export function isValidEventImageKey(key: string): boolean {
  return EVENT_IMAGE_KEY_RE.test(key)
}
