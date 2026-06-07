import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// PM2 runs the app as 2 cluster workers (ecosystem.config.js), and each worker
// instantiates its own PrismaClient with its own connection pool. Prisma's
// implicit default pool size (num_cpus * 2 + 1) is unreliable under cluster /
// containerized CPU detection, so in production we pin it explicitly: 5 per
// worker × 2 workers = 10 total connections, well within Postgres capacity on
// the CX22. Install PgBouncer only when concurrent users exceed ~200.
function resolveDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url || process.env.NODE_ENV !== 'production') return url
  if (url.includes('connection_limit')) return url
  return `${url}${url.includes('?') ? '&' : '?'}connection_limit=5`
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: resolveDatabaseUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
