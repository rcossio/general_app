import { z } from 'zod'
import { ACTIVITY_CATEGORY_KEYS } from './categories'

const optionalTrimmed = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined))

const optionalUrl = z.union([z.literal(''), z.string().trim().url().max(300)]).optional()
const optionalEmail = z.union([z.literal(''), z.string().trim().email().max(200)]).optional()

// Admin create/update payload for an activity. Association-grade contacts
// (website/facebook/instagram/email) are optional; taxCode is stored but never
// returned by the public API.
export const activitySchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.enum(ACTIVITY_CATEGORY_KEYS as [string, ...string[]]),
  type: optionalTrimmed(120),
  address: optionalTrimmed(300),
  city: optionalTrimmed(120),
  phone: optionalTrimmed(50),
  notes: optionalTrimmed(1000),
  website: optionalUrl,
  facebook: optionalUrl,
  instagram: optionalUrl,
  email: optionalEmail,
  taxCode: optionalTrimmed(20),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
})

export const activityUpdateSchema = activitySchema.partial()

export type ActivityInput = z.infer<typeof activitySchema>
