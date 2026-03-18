import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'
import { prisma } from './prisma'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m'
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d'

export interface JwtPayload {
  sub: string
  email: string
  roles: string[]
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions)
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions)
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function storeRefreshToken(
  userId: string,
  token: string
): Promise<void> {
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  })
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = hashToken(token)
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revoked: false },
    data: { revoked: true },
  })
}

export async function validateRefreshToken(token: string): Promise<boolean> {
  const tokenHash = hashToken(token)
  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash, revoked: false },
  })
  if (!stored) return false
  if (stored.expiresAt < new Date()) return false
  return true
}

export function getUserFromRequest(request: Request): JwtPayload | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    return verifyAccessToken(authHeader.slice(7))
  } catch {
    return null
  }
}
