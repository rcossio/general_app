import { z } from 'zod'

// Trim, and turn empty strings into undefined so optional fields stay null in
// the DB rather than being stored as "".
const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined))

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .url({ message: 'Must be a valid URL' })
  .optional()
  .or(z.literal('').transform(() => undefined))

const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .email({ message: 'Must be a valid email' })
  .optional()
  .or(z.literal('').transform(() => undefined))

// Admin create/update payload. All contact fields are optional; the client
// picks a single preferred one to display (see contact.ts).
export const associationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: optionalTrimmed(1000),
  website: optionalUrl,
  facebook: optionalUrl,
  instagram: optionalUrl,
  email: optionalEmail,
  phone: optionalTrimmed(50),
  address: optionalTrimmed(300),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
})

// PATCH allows any subset of the create fields.
export const associationUpdateSchema = associationSchema.partial()

export type AssociationInput = z.infer<typeof associationSchema>
