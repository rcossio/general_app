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
  ],
}
