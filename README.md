# General App — Modular PWA Platform

## Tech Summary

Next.js is a React-based framework that generates UI elements outlined in `app/route-name/page.tsx` and manages the API in `app/api/route-name/route.ts` (App Router). `[id]` is a wildcard route segment and `(group)` is an invisible grouping that doesn't affect the URL. Client components are indicated with a `'use client'` tag. Shared components can be imported from anywhere in the project. When built, output goes to `.next/`; PM2 manages the `next start` process that serves it. Tailwind is used without custom component classes.

Language is managed through app locales stored in a context, and game locales saved in the DB resolved on the client with a helper function.

Module logic is implemented in the `modules/` folder and imported in `config/modules.ts` to define `activeModules`, which is loaded dynamically in the nav bar and used to seed permissions. To disable a module: comment out its import in `config/modules.ts` and prefix its folders with `_` in `app/`, `app/api/`, and `__tests__/`.

The API is protected with RBAC. The DB is managed by Prisma, which defines the schema and applies migrations when the schema changes. On a fresh deploy the DB is seeded with roles, permissions, and initial data.

The app is a PWA. Nginx acts as reverse proxy handling gzip, static asset caching, and rate limiting on auth endpoints (10 req/min per IP). API integration tests are run with Vitest in `__tests__/`.

---

## Documentation Map

If you are an agent or developer trying to understand this project, read these files:

| File | Purpose |
|---|---|
| `README.md` | This file — overview, local dev setup, useful commands |
| `docs/SPEC.md` | Product specification — what the app is, architecture decisions, module system, API conventions, auth design |
| `docs/DEPLOYMENT.md` | Step-by-step VPS deployment guide — treat it as a verifiable checklist |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (access 15min + refresh 30d) + bcrypt
- **Styling:** Tailwind CSS (mobile-first)
- **i18n:** Custom `LocaleContext` — English, Italian, Spanish (no library)
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

See `docs/DEPLOYMENT.md` for the full step-by-step guide.

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

Optional (for email — password reset):

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Resend API key (resend.com) |
| `RESEND_FROM_EMAIL` | Sender address, e.g. `noreply@yourdomain.com` — domain must be verified in Resend |

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

### Adding a new language

1. Create `locales/<code>.ts` implementing the `Translations` type from `locales/en.ts`
2. Add the locale to the `Locale` union type in `locales/index.ts`
3. Add an entry to the `LOCALES` array in `locales/index.ts` (value, label, flag)
4. Add the import and entry to the `translations` map in `locales/index.ts`

Missing keys cause a TypeScript build error — completeness is enforced at compile time.

---

## Useful Commands

```bash
# Development
npm run dev              # start dev server
npm run build            # production build
npm run test             # run Vitest tests (auth, rbac, tracker, adventure)

# Prisma
npx prisma studio        # visual database browser
npx prisma migrate dev   # create + apply a new migration (requires CREATEDB on appuser)
npx prisma db seed       # seed roles, permissions, admin user + 10 bot community users

# PM2 (production)
pm2 status               # check running processes
pm2 logs                 # tail logs
pm2 reload app           # zero-downtime reload
pm2 monit                # live monitoring dashboard

# Deployment (run in order on the server)
npm install && npx prisma migrate deploy && pm2 stop all && npm run build && pm2 reload ecosystem.config.js --update-env && pm2 save
```

---

## Admin Account

After seeding (`npx prisma db seed`), a master admin account is created using the
`ADMIN_EMAIL` and `ADMIN_PASSWORD` values from `.env`. Log in with those credentials.

The seed also creates 10 bot community users with public workouts and tracker entries
so the community feed is populated from day one. Bot accounts use the `user` role and
cannot be distinguished from real users in the UI.
