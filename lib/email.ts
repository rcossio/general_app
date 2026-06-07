import { Resend } from 'resend'
import { env } from './env'
import { prisma } from './prisma'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!resend || !env.RESEND_FROM_EMAIL) {
    console.error('Email not configured: RESEND_API_KEY or RESEND_FROM_EMAIL missing')
    return
  }

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: 'Reset your password — Vysi',
    html: `
      <p>You requested a password reset for your Vysi account.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#48b35c;color:#fff;text-decoration:none;border-radius:6px;">Reset password</a></p>
      <p style="color:#666;font-size:13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Notifies the operator (NOTIFY_EMAIL, falling back to ADMIN_EMAIL) whenever a
// new user is created. Best-effort: silently skips if email isn't configured.
export async function sendNewUserNotification(params: {
  name: string
  email: string
  provider: 'google' | 'email'
  totalUsers?: number
}) {
  if (!resend || !env.RESEND_FROM_EMAIL) return

  // Recipients: everyone holding the users_admin role; fall back to the
  // NOTIFY_EMAIL / ADMIN_EMAIL env if no one has the role yet.
  let recipients: string[] = []
  try {
    const admins = await prisma.user.findMany({
      where: { deletedAt: null, userRoles: { some: { role: { slug: 'users_admin' } } } },
      select: { email: true },
    })
    recipients = admins.map((u) => u.email)
  } catch {
    recipients = []
  }
  if (recipients.length === 0) {
    const fallback = env.NOTIFY_EMAIL || env.ADMIN_EMAIL
    if (fallback) recipients = [fallback]
  }
  if (recipients.length === 0) return

  const { name, email, provider, totalUsers } = params
  const method = provider === 'google' ? 'Google OAuth' : 'Email + contraseña'
  const serverTime = new Date().toString()

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: recipients,
    subject: `Nuevo usuario en Vysi: ${name}`,
    html: `
      <h2>Nuevo usuario 🎉</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Método de registro:</strong> ${method}</p>
      <p><strong>Hora del servidor:</strong> ${escapeHtml(serverTime)}</p>
      ${totalUsers != null ? `<p><strong>Usuarios totales:</strong> ${totalUsers}</p>` : ''}
    `,
  })
}
