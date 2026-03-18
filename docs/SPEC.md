# Product Specification — Modular PWA Platform

This document is the source of truth for what this app is and how it should be built.
Any Claude instance (local or on the VPS) can read this to understand the full context.

---

## Philosophy

Single Next.js project that handles both frontend and backend via Route Handlers
(`app/api/...`). No separate backend process. One codebase, one build, one PM2 process.

Designed to run on a single Hetzner CX23 VPS (2 vCPU, 4 GB RAM, Ubuntu 24.04).
Every architectural decision is made with that constraint in mind.

The app is a **modular platform**: a single user account gives access to multiple
independent modules. Modules can be connected or disconnected without touching core
code. Future modules are added by dropping a new folder into `modules/` and registering
it in `config/modules.ts`.

**Active modules:** Workout, Life Tracker

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack in one process |
| Language | TypeScript (strict, no `any`) | Safety |
| Database | PostgreSQL (self-hosted) | Reliable, free |
| ORM | Prisma | Schema as source of truth |
| Validation | Zod | All inputs, API and forms |
| Auth | JWT + bcrypt | Access token 15min, refresh 30d |
| Styling | Tailwind CSS (mobile-first) | Fast, consistent |
| PWA | manifest.json + service worker | Installable on iOS and Android |
| Process manager | PM2 | Cluster mode, auto-restart |
| Reverse proxy | Nginx | Gzip, static caching, SSL |
| i18n | Custom LocaleContext | EN/IT/ES, cookie-persisted, no library |
| Testing | Vitest | Integration tests for security-critical logic |

---

## Module System

### Core concept

A module controls two things via its manifest: **navigation** (the nav item appears
automatically) and **permissions** (RBAC is seeded automatically). Pages and API routes
live in `/app/` and `/app/api/` as Next.js requires — the module folder holds the
manifest and validation schemas only.

To disable a module: comment out its import in `config/modules.ts`. Its nav item
disappears and its permissions are revoked. Its routes remain in `/app/` but are
protected by RBAC so they return 403 to all users.

### Module registry

```ts
// config/modules.ts
import workout from '@/modules/workout/manifest'
import lifeTracker from '@/modules/life-tracker/manifest'
// import events from '@/modules/events/manifest'  ← commented = disconnected

export const activeModules = [workout, lifeTracker]
```

### Module manifest shape

```typescript
// modules/<name>/manifest.ts
export default {
  id: string,
  name: string,
  isActive: boolean,
  navItem: {
    label: string,
    href: string,
    icon: string        // lucide-react icon name
  },
  permissions: string[],  // permissions this module needs
  apiPrefix: string,
}
```

The bottom nav, sidebar, and permission seeding are all built dynamically from
`activeModules`. Nothing module-specific is hardcoded outside its own folder.

### Adding a new module (5 steps)

1. Create `modules/<name>/manifest.ts` and `modules/<name>/lib/schemas.ts`
2. Write the manifest following the shape above
3. Add Prisma models to `prisma/schema.prisma` in a clearly commented section
4. Register in `config/modules.ts`
5. Add pages under `/app/<name>/` and API routes under `/app/api/<name>/`
6. Run `npx prisma migrate dev --name add_<name>_module`

---

## Project Structure

```
project-root/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── workout/
│   │   │   ├── routines/
│   │   │   │   └── public/   # unauthenticated public feed
│   │   │   └── ...
│   │   └── tracker/
│   │       ├── entries/
│   │       │   └── public/   # unauthenticated public feed
│   │       └── ...
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── workout/              # workout module pages
│   ├── tracker/              # life-tracker module pages
│   ├── profile/              # includes language selector
│   ├── admin/
│   └── layout.tsx            # reads activeModules, wraps LocaleProvider + AuthProvider
├── modules/
│   ├── workout/              # manifest.ts + lib/schemas.ts
│   └── life-tracker/         # manifest.ts + lib/schemas.ts
├── config/
│   └── modules.ts
├── contexts/
│   ├── AuthContext.tsx
│   └── LocaleContext.tsx     # i18n provider: t(), locale, setLocale
├── locales/
│   ├── en.ts                 # source of truth, exports Translations type
│   ├── it.ts                 # Italian, typed as Translations
│   ├── es.ts                 # Spanish, typed as Translations
│   └── index.ts              # Locale type, LOCALES array, translations map
├── lib/
│   ├── prisma.ts             # Prisma singleton
│   ├── auth.ts               # JWT sign/verify/refresh logic
│   ├── permissions.ts        # RBAC helpers
│   └── storage.ts            # Cloudflare R2 upload helper
├── components/
│   ├── layout/               # BottomNav, Sidebar, Header (dynamic from modules)
│   └── ui/                   # Shared reusable components
├── prisma/
│   ├── schema.prisma         # single file, sections by module
│   └── seed.ts               # roles, admin, + 10 bot community users
├── public/
│   ├── manifest.json
│   └── icons/                # PWA icons: 192x192 and 512x512
└── __tests__/
    ├── auth.test.ts
    ├── rbac.test.ts
    ├── tracker.test.ts
    └── workout.test.ts
```

---

## Database Schema

### Core

- **users** — id, email (unique), password_hash, name, avatar_url, created_at, updated_at
- **roles** — id, name, slug (unique): master_admin | admin | moderator | user
- **permissions** — id, resource, action — unique on (resource, action)
- **user_roles** — pivot: user_id, role_id
- **role_permissions** — pivot: role_id, permission_id
- **refresh_tokens** — id, user_id, token_hash, expires_at, revoked, created_at

### Workout module

- **workout_routines** — id, user_id, name, description, is_public (default false), created_at, updated_at; indexed on (is_public, created_at)
- **workout_days** — id, routine_id, day_of_week (0-6), name
- **workout_exercises** — id, day_id, name, sets, reps, duration_seconds, rest_seconds, notes, order

### Life Tracker module

- **tracker_entries** — id, user_id, type (DESIRE|EMOTION|GOAL|ACHIEVEMENT), title, content, score (1-10), tags (String[]), is_public (default false), created_at; indexed on (is_public, createdAt)

### Schema rules

- All foreign keys have explicit indexes
- `@updatedAt` on all updated_at fields
- All IDs use `cuid()`
- Prisma connection pool: max 10 connections

---

## RBAC System

- Permissions follow `resource:action` format — e.g. `workout:create`, `tracker:manage`
- `master_admin` and `admin` bypass all permission checks automatically
- `requirePermission(resource, action)` in `lib/permissions.ts`:
  - Extracts user from JWT in Authorization header
  - Returns 401 if no/invalid token
  - Auto-passes for master_admin and admin
  - Checks role_permissions for all other roles
  - Returns 403 with consistent error code if missing
- Permissions are seeded from `activeModules[].permissions` automatically

---

## Auth System

### Endpoints

```
POST /api/auth/register   → create user, assign 'user' role, return tokens
POST /api/auth/login      → validate credentials, return access + refresh tokens
POST /api/auth/refresh    → exchange refresh token for new access token
POST /api/auth/logout     → revoke refresh token in DB
GET  /api/auth/me         → return current user with roles and flat permissions list
```

### Token rules

- Access token: JWT, 15min expiry, returned in response body
- Refresh token: JWT, 30d expiry, stored hashed in DB, returned in httpOnly cookie AND body
- On refresh: verify → check DB not revoked → issue new pair → revoke old (rotation)
- On logout: mark refresh token as revoked in DB

### Frontend auth

- Access token stored in memory via React context (never localStorage)
- Refresh token in httpOnly cookie
- Fetch wrapper auto-calls `/api/auth/refresh` on 401, retries original request once
- Protected pages redirect to `/login` if not authenticated

---

## API Design Rules

- Zod validation on every request body and query param
- Error format: `{ error: string, code: string }`
- Success format: `{ data: T }`
- Pagination on all list endpoints: `?page=1&limit=20`
- Never query without WHERE on an indexed column in list endpoints
- Use Prisma `select` — never return full rows when only a subset is displayed
- HTTP status codes: 200, 201, 400, 401, 403, 404, 500

---

## Workout Module Endpoints

```
GET    /api/workout/routines                → list my routines (paginated)
POST   /api/workout/routines                → create routine
GET    /api/workout/routines/public         → public community feed (no auth, ?limit=)
GET    /api/workout/routines/[id]           → get routine with days and exercises
PUT    /api/workout/routines/[id]           → update routine metadata (incl. isPublic)
DELETE /api/workout/routines/[id]           → delete (owner or admin only)
POST   /api/workout/routines/[id]/days      → add day to routine
PUT    /api/workout/days/[id]               → update day
DELETE /api/workout/days/[id]               → delete day
POST   /api/workout/days/[id]/exercises     → add exercise to day
PUT    /api/workout/exercises/[id]          → update exercise
DELETE /api/workout/exercises/[id]          → delete exercise
PATCH  /api/workout/exercises/reorder       → reorder exercises within a day
```

---

## Life Tracker Module Endpoints

```
GET    /api/tracker/entries                 → list my entries (paginated, ?type=EMOTION)
POST   /api/tracker/entries                 → create entry
GET    /api/tracker/entries/public          → public community feed (no auth, ?limit=, ?type=)
GET    /api/tracker/entries/[id]            → get single entry
PUT    /api/tracker/entries/[id]            → update entry (incl. isPublic)
DELETE /api/tracker/entries/[id]            → delete entry
GET    /api/tracker/stats                   → score averages by type (cached 60s per user)
```

### Public feed rules

- No `requirePermission` guard — fully unauthenticated
- Returns only entries/routines where `isPublic = true`
- Includes `user.name` so the community can see who posted
- Default `limit=20`, capped at 100; ordered by `createdAt desc`

---

## Frontend Pages

### Layout

- Bottom nav on mobile, collapsible sidebar on desktop — both built from `activeModules`
- Nav labels are translated via `useLocale()` / `t()`
- Dark/light mode toggle stored in localStorage
- `LocaleProvider` wraps `AuthProvider` wraps entire app

### i18n

- Locale stored in `localStorage` key `'locale'`; falls back to `'en'`
- `useLocale()` returns `{ t, locale, setLocale }` — call `t('section.key')` anywhere
- Changing locale in Profile applies immediately app-wide (React context re-render)
- `t()` supports `{placeholder}` interpolation: `t('dashboard.welcomeBack', { name })`
- TypeScript enforces completeness: `it.ts` and `es.ts` both implement `Translations`; adding a key to `en.ts` without updating the others is a build error

### Pages

**Core:**
- `/` — Dashboard: module cards, recent workout activity, recent tracker entries
- `/login` — Login form
- `/register` — Register form
- `/profile` — View/edit name and avatar URL; language selector (EN / IT / ES flags)
- `/admin` — User list with role assignment (admin and master_admin only)

**Workout module:**
- `/workout` — My routines list with isPublic toggle per item; Community Routines section (public feed, up to 12 items, scrollable)
- `/workout/[id]` — Full routine: days, exercises, inline editing, reordering; isPublic toggle

**Life Tracker module:**
- `/tracker` — Entry feed, filter by type, stats bar with avg score per type; Community section (public feed, up to 12 items, scrollable)
- `/tracker/new` — Create entry: type selector, score slider (1-10), tag input, isPublic checkbox
- `/tracker/[id]` — Edit entry: same fields as new, pre-populated

### UX requirements

- Optimistic UI on entry creation and exercise reordering
- Inline Zod validation errors on all forms
- Loading skeletons on data fetches (not spinners)

---

## PWA Configuration

- `public/manifest.json`: name, short_name, start_url `/`, display standalone, portrait
- Service worker caches app shell for basic offline support
- iOS meta tags in `app/layout.tsx`: apple-mobile-web-app-capable, status-bar-style, touch-icon
- Installable via "Add to Home Screen" on iOS Safari and Android Chrome

---

## File Storage

- Never serve user uploads from the VPS
- All uploads go to Cloudflare R2 via `lib/storage.ts`
- Only the R2 URL is stored in PostgreSQL
- R2 free tier: 10 GB, no egress fees

---

## Tests (Vitest)

Integration tests only, for security-critical logic. 43 tests total across 4 files.

**`__tests__/auth.test.ts`**
- Register creates user with hashed password
- Login with correct credentials returns valid tokens
- Login with wrong password returns 401
- Refresh with valid token returns new pair
- Refresh with revoked token returns 401
- Logout marks refresh token as revoked
- GET /api/auth/me with expired token returns 401

**`__tests__/rbac.test.ts`**
- User role cannot access admin-only endpoint (403)
- Admin role can access all endpoints
- master_admin bypasses all permission checks
- requirePermission returns 403 with correct error code
- requirePermission returns 401 with no token

**`__tests__/workout.test.ts`**
- CRUD operations on routines (create, read, update, delete)
- isPublic toggle reflected in public feed
- Public feed accessible without authentication

**`__tests__/tracker.test.ts`**
- CRUD operations on entries
- isPublic toggle reflected in public feed
- Public feed accessible without authentication
- `?type=` filter on public feed

---

## Seed Data

`prisma/seed.ts` creates:

**Core:**
- Roles: master_admin, admin, moderator, user
- Permissions for all active modules from `activeModules[].permissions`
- Default master_admin: created from `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars
- All permissions assigned to master_admin and admin roles

**Bot community users (10 accounts, idempotent):**
Each has the `user` role. All their workouts and tracker entries are `isPublic: true`
so the community feed is populated from first login. Skipped if already exists.

| Bot | Routine | Tracker theme |
|---|---|---|
| Alex Rivera | PPL split + mobility | High-score entries (8–10) |
| Maria Santos | Beginner 3-day | Mixed scores (3–8) |
| James Park | — | Mental health journal (2–9) |
| Sofia Chen | Hypertrophy block | High scores (9–10) |
| Marcus Webb | Comeback plan | Low scores (2–6) |
| Priya Patel | Yoga flow | Mindfulness (7–9) |
| Tom Larsson | — | Life journal (2–8) |
| Zara Ahmed | Running base | Improvement arc (2–9) |
| Lucas Moreau | Stronglifts + conditioning | — |
| Nina Okafor | 3-day dumbbell | Balanced (6–8) |
