module.exports = {
  apps: [
    {
      name: 'general-app',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/app',
      // Cluster mode: max 2 instances appropriate for Hetzner CX22 (2 vCPU)
      instances: 2,
      exec_mode: 'cluster',
      // Restart if process exceeds 800MB RAM
      max_memory_restart: '800M',
      // Auto-restart on crash
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Log files
      out_file: '/home/deploy/logs/app-out.log',
      error_file: '/home/deploy/logs/app-err.log',
      merge_logs: true,
    },
    {
      // Once-a-day digest of new users (replaces per-signup emails to stay
      // within the Resend daily quota). One-shot script: PM2 launches it, it
      // exits, and cron_restart re-runs it on schedule. Lives here in the repo
      // so the schedule travels with the app to any VPS — no system crontab.
      // NOTE: pm2 also runs it once at start/reload; with test accounts
      // excluded that send is a no-op unless real users signed up in the window.
      name: 'digest-new-users',
      script: 'node_modules/.bin/tsx',
      args: 'scripts/notify-new-users-digest.ts',
      cwd: '/var/www/app',
      exec_mode: 'fork',
      instances: 1,
      autorestart: false,
      // 16:00 UTC = 18:00 in Italy during CEST (summer). PM2 cron is UTC-fixed
      // and does NOT follow DST, so in winter (CET) it fires at 17:00 Italy.
      cron_restart: '0 16 * * *',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      out_file: '/home/deploy/logs/digest-out.log',
      error_file: '/home/deploy/logs/digest-err.log',
      merge_logs: true,
    },
  ],
}
