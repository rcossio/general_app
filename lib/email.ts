import { Resend } from 'resend'
import { env } from './env'

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
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Reset password</a></p>
      <p style="color:#666;font-size:13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  })
}
