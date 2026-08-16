// Once-a-day digest of new users, emailed to the users_admin recipients. This
// replaces the old per-signup notification so we stay within the Resend daily
// quota. Triggered by PM2 `cron_restart` (see ecosystem.config.js) so the
// schedule travels with the repo and runs as a single one-shot process — no
// PM2-cluster duplication.
//
// Self-contained env loading: works under PM2, via `tsx scripts/...`, or on a
// fresh VPS. Pass --dry-run to print what would be sent without emailing.
//
//   npx tsx scripts/notify-new-users-digest.ts            # send
//   npx tsx scripts/notify-new-users-digest.ts --dry-run  # preview only

const WINDOW_MS = 24 * 60 * 60 * 1000

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  // Load .env BEFORE importing anything that validates process.env (lib/env).
  try {
    process.loadEnvFile('.env')
  } catch {
    // No .env file present — assume the runtime already provides the variables.
  }

  const { prisma } = await import('../lib/prisma')
  const { sendNewUsersDigestEmail } = await import('../lib/email')

  const since = new Date(Date.now() - WINDOW_MS)
  // Exclude soft-deleted users and test accounts (the reserved `.invalid` TLD
  // used by the test suite and smoke checks).
  const notTest = { NOT: { email: { endsWith: '.invalid' } } }

  try {
    const recent = await prisma.user.findMany({
      where: { deletedAt: null, createdAt: { gte: since }, ...notTest },
      orderBy: { createdAt: 'asc' },
      select: { name: true, email: true, passwordHash: true, createdAt: true },
    })

    if (recent.length === 0) {
      console.log('[digest] no new users in the last 24h — nothing to send')
      return
    }

    const totalUsers = await prisma.user.count({ where: { deletedAt: null, ...notTest } })

    const users = recent.map((u) => ({
      name: u.name,
      email: u.email,
      // OAuth accounts store a password hash prefixed with "oauth:".
      provider: u.passwordHash.startsWith('oauth:') ? ('google' as const) : ('email' as const),
      createdAt: u.createdAt,
    }))

    if (dryRun) {
      console.log(`[digest] DRY RUN — would email ${users.length} new user(s) (total ${totalUsers}):`)
      for (const u of users) {
        console.log(`  - ${u.name} <${u.email}> (${u.provider}) ${u.createdAt.toISOString()}`)
      }
      return
    }

    const res = await sendNewUsersDigestEmail(users, totalUsers)
    console.log(`[digest] ${users.length} new user(s); sent=${res.sent} recipients=${res.recipients}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('[digest] failed:', e)
  process.exitCode = 1
})
