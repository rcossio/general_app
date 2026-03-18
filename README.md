# General App — Modular PWA Platform

A full-stack PWA built with the T3 Stack pattern. Single Next.js project handling both
frontend and backend via Route Handlers. Modular architecture: drop a new folder into
`modules/` and register it in `config/modules.ts` to add a feature.

**Active modules:** Workout, Life Tracker

---

## Documentation Map

If you are an agent or developer trying to understand this project, read these files:

| File | Purpose |
|---|---|
| `README.md` | This file — overview, local dev setup, useful commands |
| `SPEC.md` | Product specification — what the app is, architecture decisions, module system, API conventions, auth design |
| `DEPLOYMENT.md` | Step-by-step VPS deployment guide — treat it as a verifiable checklist |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (access 15min + refresh 30d) + bcrypt
- **Styling:** Tailwind CSS (mobile-first)
- **PWA:** manifest.json + service worker
- **Process manager:** PM2
- **Reverse proxy:** Nginx

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL running locally

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in at minimum:

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/appdb
JWT_ACCESS_SECRET=any-random-string
JWT_REFRESH_SECRET=another-random-string
ADMIN_EMAIL=admin@local
ADMIN_PASSWORD=changeme
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To stop: `Ctrl+C`. PostgreSQL keeps running as a system service — no need to restart it.

### Re-running after a reboot

```bash
# Check PostgreSQL is up
sudo systemctl status postgresql
# If stopped:
sudo systemctl start postgresql

# Then just:
npm run dev
```

---

## Production Deployment

See `DEPLOYMENT.md` for the full step-by-step guide.

The short version:
1. Provision a Hetzner CX23 running Ubuntu 24.04
2. Point DNS for your domain to the server IP
3. SSH in and follow `DEPLOYMENT.md` from top to bottom

---

## Environment Variables

See `.env.example` for the full list. Required before first run:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens — `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens — different from above |
| `NEXT_PUBLIC_APP_URL` | Your public domain, e.g. `https://yourdomain.com` |
| `ADMIN_EMAIL` | Email for the seeded master admin account |
| `ADMIN_PASSWORD` | Password for the seeded master admin account |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID (for file uploads — optional) |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Public URL for R2 bucket |

Optional (for tests):

| Variable | Description |
|---|---|
| `TEST_DATABASE_URL` | Separate test database URL |

---

## Module System

Each module lives in `modules/<name>/` and exports a manifest. To activate or
deactivate a module, edit `config/modules.ts` — no other file needs to change.

### Adding a new module (5 steps)

1. Create `modules/<name>/manifest.ts` and `modules/<name>/lib/schemas.ts`
2. Write the manifest following the shape in `modules/workout/manifest.ts`
3. Add your Prisma models to `prisma/schema.prisma` in a clearly commented section
4. Register in `config/modules.ts`: `import myModule from '@/modules/<name>/manifest'` and add to `activeModules`
5. Run `npx prisma migrate dev --name add_<name>_module`

The nav bar, permissions, and API prefix are all picked up automatically.

---

## Useful Commands

```bash
# Development
npm run dev              # start dev server
npm run build            # production build
npm run test             # run Vitest tests

# Prisma
npx prisma studio        # visual database browser
npx prisma migrate dev   # create + apply a new migration
npx prisma db seed       # seed roles, permissions, admin user

# PM2 (production)
pm2 status               # check running processes
pm2 logs                 # tail logs
pm2 reload app           # zero-downtime reload
pm2 monit                # live monitoring dashboard

# Deployment
bash deploy.sh           # pull, migrate, build, reload PM2
bash backup.sh           # manual database backup to R2
```

---

## Admin Account

After seeding (`npx prisma db seed`), a master admin account is created using the
`ADMIN_EMAIL` and `ADMIN_PASSWORD` values from `.env`. Log in with those credentials.
