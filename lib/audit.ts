/**
 * Structured audit logging for security-relevant events.
 * Output goes to stdout → PM2 captures it to /home/deploy/logs/app-out.log.
 *
 * Usage:
 *   audit('login_failed', { email, ip, reason: 'invalid_credentials' })
 */
export function audit(event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({
    audit: true,
    event,
    ...data,
    at: new Date().toISOString(),
  }))
}
