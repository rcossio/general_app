import { z } from 'zod'

// A social link: a valid http(s) URL, or an empty string meaning "clear it".
const socialUrl = z.union([z.literal(''), z.string().trim().url().max(300)]).optional()

export const createProfileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(200).optional(),
})

// The editor saves the whole profile form, so update takes the full field set
// (name required); empty social/subtitle strings clear the field.
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(200).optional(),
  facebook: socialUrl,
  instagram: socialUrl,
  tiktok: socialUrl,
})

// A Tiptap document. We only assert the top-level shape here; safety comes from
// rendering with the constrained extension set (see richText.ts), not from
// deep-validating every node.
const tiptapDoc = z.object({ type: z.literal('doc') }).passthrough()

export const MAX_POST_IMAGES = 10

export const postSchema = z.object({
  content: tiptapDoc,
  // Ordered R2 object keys (the carousel). Stored as-is; resolved to URLs at
  // render time. Validated to the memories/ namespace below.
  images: z.array(z.string().min(1).max(300)).max(MAX_POST_IMAGES).default([]),
  locationLabel: z.string().trim().max(200).optional(),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
})

export type CreateProfileInput = z.infer<typeof createProfileSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type PostInput = z.infer<typeof postSchema>

// Image keys are minted only by the upload-url endpoint as memories/<uuid>.jpg.
// Validate the exact shape so a saved key can't point outside the namespace.
const MEMORY_IMAGE_KEY_RE = /^memories\/[0-9a-f-]+\.(jpg|webp)$/

export function isValidMemoryImageKey(key: string): boolean {
  return MEMORY_IMAGE_KEY_RE.test(key)
}
