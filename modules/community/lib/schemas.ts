import { z } from 'zod'
import { NOTICE_CATEGORY_KEYS, NOTE_REQUIRED_CATEGORIES } from './categories'

export const createNoticeSchema = z
  .object({
    category: z.enum(NOTICE_CATEGORY_KEYS as [string, ...string[]]),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    note: z.string().trim().max(280).optional(),
    // R2 object key of an already-uploaded photo (required — see upload-url endpoint).
    photoKey: z.string().min(1).max(200),
  })
  .refine((d) => !NOTE_REQUIRED_CATEGORIES.includes(d.category) || !!d.note?.trim(), {
    message: 'A note is required for this category',
    path: ['note'],
  })

// Marking a notice as fixed by a volunteer requires before + after photos.
export const markFixedSchema = z.object({
  beforePhotoKey: z.string().min(1).max(200),
  afterPhotoKey: z.string().min(1).max(200),
})

export type CreateNoticeInput = z.infer<typeof createNoticeSchema>

// Photo keys are minted only by the upload-url endpoint as `community/<uuid>.jpg`.
// Validate that exact shape (not just the prefix) so a submitted key can't point
// outside the expected namespace.
const PHOTO_KEY_RE = /^community\/[0-9a-f-]+\.jpg$/

export function isValidPhotoKey(key: string): boolean {
  return PHOTO_KEY_RE.test(key)
}
