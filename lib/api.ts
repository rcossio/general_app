import { NextResponse } from 'next/server'
import { z } from 'zod'

// Small helpers for the app's HTTP contract, so the { error, code } error shape
// and the parse→validate boilerplate live in one place instead of being
// re-typed (and occasionally mistyped) in every route. Success responses stay
// as plain `NextResponse.json({ data })` at the call site.

// Standard error response: { error, code } with an HTTP status.
export function jsonError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: message, code }, { status })
}

// Read + validate a JSON request body against a Zod schema. Returns the parsed
// data on success, or a ready-to-return error NextResponse (400) on invalid JSON
// or validation failure. Pair with isNextResponse() to short-circuit:
//
//   const input = await parseJson(request, mySchema)
//   if (isNextResponse(input)) return input
//   // input is now the fully-typed, validated data
export async function parseJson<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<z.infer<T> | NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('BAD_REQUEST', 'Invalid JSON', 400)
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Validation error', 400)
  }
  return parsed.data
}
