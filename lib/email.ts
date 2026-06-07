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

// Recipients for operator notifications: everyone holding the users_admin role,
// falling back to NOTIFY_EMAIL / ADMIN_EMAIL if no one holds the role yet.
async function getNotifyRecipients(): Promise<string[]> {
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
  return recipients
}

export interface DigestUser {
  name: string
  email: string
  provider: 'google' | 'email'
  createdAt: Date
}

// Once-a-day summary of new sign-ups. Replaces the old per-signup email so we
// stay within the Resend daily quota. Sent by scripts/notify-new-users-digest.ts.
// Returns whether an email was actually sent and to how many recipients.
export async function sendNewUsersDigestEmail(
  users: DigestUser[],
  totalUsers: number
): Promise<{ sent: boolean; recipients: number }> {
  if (!resend || !env.RESEND_FROM_EMAIL) return { sent: false, recipients: 0 }
  if (users.length === 0) return { sent: false, recipients: 0 }

  const recipients = await getNotifyRecipients()
  if (recipients.length === 0) return { sent: false, recipients: 0 }

  const rows = users
    .map(
      (u) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(u.name)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(u.email)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${u.provider === 'google' ? 'Google' : 'Email'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#666;">${escapeHtml(u.createdAt.toISOString())}</td>
      </tr>`
    )
    .join('')

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: recipients,
    subject: `Vysi — ${users.length} usuario(s) nuevo(s) en las últimas 24 h`,
    html: `
      <h2>Resumen diario de nuevos usuarios 🎉</h2>
      <p>${users.length} alta(s) en las últimas 24 h · ${totalUsers} usuarios en total.</p>
      <table style="border-collapse:collapse;font-size:14px;margin-top:8px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ccc;">Nombre</th>
            <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ccc;">Email</th>
            <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ccc;">Método</th>
            <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ccc;">Alta (UTC)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `,
  })
  return { sent: true, recipients: recipients.length }
}
