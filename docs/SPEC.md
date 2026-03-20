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

**Active modules:** Life Tracker, Adventure
**Disabled modules:** Workout (code intact, import commented out in `config/modules.ts`)

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
| i18n | Custom LocaleContext | EN/IT/ES, localStorage-persisted, no library |
| Testing | Vitest | Integration tests for security-critical logic |
| Maps | Leaflet + react-leaflet v4 | Location-based game rendering |

---

## Module System

### Core concept

A module controls two things via its manifest: **navigation** (the nav item appears
automatically) and **permissions** (RBAC is seeded automatically). Pages and API routes
live in `/app/` and `/app/api/` as Next.js requires — the module folder holds the
manifest and validation schemas only.

**To disable a module:** comment out its import in `config/modules.ts` and remove it
from the `activeModules` array. Its nav item disappears and its permissions are no
longer seeded, so its API routes return 403 to all non-admin users automatically via
RBAC. The module code, pages, and database tables are untouched.

Do not rely on `isActive: false` in the manifest alone — the manifest flag is only
relevant when the module is imported. The import in `config/modules.ts` is the
primary switch.

### Module registry

```ts
// config/modules.ts
// import workout from '@/modules/workout/manifest'   ← commented = disconnected
import lifeTracker from '@/modules/life-tracker/manifest'
import adventure from '@/modules/adventure/manifest'

export const activeModules = [lifeTracker, adventure]
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
│   │   ├── workout/          # disabled — routes intact, return 403 via RBAC
│   │   ├── tracker/
│   │   │   ├── entries/
│   │   │   │   └── public/   # unauthenticated public feed
│   │   │   └── ...
│   │   └── adventure/
│   │       ├── games/
│   │       └── sessions/
│   │           └── [id]/
│   │               └── visit/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── workout/              # disabled — pages intact, hidden from nav
│   ├── tracker/
│   ├── adventure/
│   │   └── [sessionId]/      # full-screen map page, hides platform chrome
│   ├── profile/
│   ├── admin/
│   └── layout.tsx
├── modules/
│   ├── workout/              # manifest.ts + lib/schemas.ts
│   ├── life-tracker/
│   └── adventure/
│       ├── manifest.ts
│       ├── lib/
│       │   ├── condition.ts  # evaluates visibleWhen/when conditions against flag sets
│       │   ├── haversine.ts  # GPS distance calculation
│       │   └── schemas.ts
│       └── components/
│           ├── AdventureMap.tsx   # Leaflet map (dynamic import, SSR disabled)
│           └── LocationSheet.tsx  # bottom sheet overlay for location interaction
├── scripts/
│   ├── import-game.ts        # CLI tool to seed game data from JSON
│   └── chapter1.json         # Chapter 1 game definition with multilingual content
├── config/
│   └── modules.ts
├── contexts/
│   ├── AuthContext.tsx
│   └── LocaleContext.tsx
├── locales/
│   ├── en.ts                 # source of truth, exports Translations type
│   ├── it.ts
│   ├── es.ts
│   └── index.ts
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── permissions.ts
│   └── storage.ts
├── components/
│   └── layout/               # BottomNav, Sidebar, Header (dynamic from modules)
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
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

### Workout module (disabled, tables intact)

- **workout_routines** — id, user_id, name, description, is_public, created_at, updated_at
- **workout_days** — id, routine_id, day_of_week (0-6), name
- **workout_exercises** — id, day_id, name, sets, reps, duration_seconds, rest_seconds, notes, order

### Life Tracker module

- **tracker_entries** — id, user_id, type (DESIRE|EMOTION|GOAL|ACHIEVEMENT), title, content, score (1-10), tags (String[]), is_public, created_at

### Adventure module

- **games** — id, slug (unique), title (Json/multilingual), description, chapter, next_game_id (nullable, self-ref), is_active, created_at, updated_at
- **game_locations** — id, game_id, external_id, name (Json/multilingual), lat, lng, radius_m (default 35), visible_when (Json/nullable), values (Json array), grants (Json array), order
- **game_sessions** — id, game_id, user_id, started_at, completed_at (nullable); unique on (game_id, user_id)
- **session_flags** — id, session_id, flag, set_at; unique on (session_id, flag)
- **location_visits** — id, session_id, location_id, visited_at; unique on (session_id, location_id)

#### Multilingual fields

`game.title` and `game_location.name` are `JSONB` columns storing `{ "en": "...", "it": "...", "es": "..." }` objects. The `values` array in `game_location` contains objects whose `content` field is also multilingual. Resolution happens entirely on the client using `useLocale()` — the API returns the raw multilingual objects and the frontend picks the correct locale string.

#### Game content format (chapter JSON)

```json
{
  "title": { "en": "The Garden", "it": "Il Giardino", "es": "El Jardín" },
  "locations": [
    {
      "id": "loc_1_start",
      "name": { "en": "Notice Board", "it": "Bacheca degli Avvisi", "es": "Tablón de Anuncios" },
      "coordinates": { "lat": 45.01, "lng": 8.62 },
      "radiusM": 35,
      "visibleWhen": null,
      "values": [
        {
          "when": null,
          "content": { "en": "...", "it": "...", "es": "..." },
          "completesChapter": true
        }
      ],
      "grants": [{ "flag": "flag_name" }]
    }
  ]
}
```

`visibleWhen` and `when` accept: `null` (always true), `"flag_string"`, `{ "and": [...] }`, or `{ "or": [...] }`.

Import command:
```bash
npx tsx scripts/import-game.ts \
  --file=scripts/chapter1.json \
  --slug=chapter-1 \
  --chapter=1 \
  --activate
```

### Schema rules

- All foreign keys have explicit indexes
- `@updatedAt` on all updated_at fields
- All IDs use `cuid()`

---

## RBAC System

- Permissions follow `resource:action` format — e.g. `tracker:create`, `adventure:play`
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

## Adventure Module Endpoints

```
GET    /api/adventure/games                     → list active games with user's session status
POST   /api/adventure/sessions                  → start a new session for a game
GET    /api/adventure/sessions/[id]             → load session state (flags, visits, resolved locations)
DELETE /api/adventure/sessions/[id]             → delete session (restart chapter)
POST   /api/adventure/sessions/[id]/visit       → visit a location (GPS-verified, applies grants)
```

### Visit endpoint logic

1. Verify session belongs to the authenticated user
2. Evaluate `visibleWhen` condition against current flag set — return 403 if not visible
3. Check GPS distance against `radius_m` — return 400 with distance if too far
4. Evaluate `values` array to resolve narrative (first matching `when` condition wins)
5. If not already visited: record visit, apply grants (new flags), mark chapter complete if `completesChapter: true`
6. Return `{ narrative, newFlags, completesChapter, alreadyVisited, nextGameId }`

All narrative and name fields returned from the API are raw multilingual objects `{ en, it, es }` — resolution to a string happens on the client.

---

## Life Tracker Module Endpoints

```
GET    /api/tracker/entries                 → list my entries (paginated, ?type=EMOTION)
POST   /api/tracker/entries                 → create entry
GET    /api/tracker/entries/public          → public community feed (no auth)
GET    /api/tracker/entries/[id]            → get single entry
PUT    /api/tracker/entries/[id]            → update entry
DELETE /api/tracker/entries/[id]            → delete entry
GET    /api/tracker/stats                   → score averages by type (cached 60s per user)
```

### Public feed rules

- No `requirePermission` guard — fully unauthenticated
- Returns only entries where `isPublic = true`
- Default `limit=20`, capped at 100; ordered by `createdAt desc`

---

## Frontend Pages

### Layout

- Bottom nav on mobile, collapsible sidebar on desktop — both built from `activeModules`
- Nav labels are translated via `useLocale()` / `t()`
- Dark/light mode toggle stored in localStorage
- `LocaleProvider` wraps `AuthProvider` wraps entire app
- Both nav components check the current pathname: if it matches `/adventure/[sessionId]`,
  they render `null` — the adventure session page is always full-screen with no chrome

### i18n

- Locale stored in `localStorage` key `'locale'`; falls back to `'en'`
- `useLocale()` returns `{ t, locale, setLocale }` — call `t('section.key')` anywhere
- Changing locale in Profile applies immediately app-wide (React context re-render)
- `t()` supports `{placeholder}` interpolation: `t('dashboard.welcomeBack', { name })`
- TypeScript enforces completeness: `it.ts` and `es.ts` both implement `Translations`; adding a key to `en.ts` without updating the others is a build error
- Game content (location names, narratives, game titles) uses a separate resolution pattern:
  the API returns raw `{ en, it, es }` objects and the frontend calls `resolveI18n(value, locale)` to pick the right string

### Pages

**Core:**
- `/` — Dashboard: module cards, recent activity
- `/login` — Login form (+ Google OAuth)
- `/register` — Register form
- `/profile` — View/edit name and avatar; language selector (EN / IT / ES)
- `/admin` — User list with role assignment (admin and master_admin only)

**Life Tracker module:**
- `/tracker` — Entry feed, filter by type, stats bar; community public feed
- `/tracker/new` — Create entry: type, score slider (1-10), tags, isPublic
- `/tracker/[id]` — Edit entry

**Adventure module:**
- `/adventure` — List of active games with start/resume buttons
- `/adventure/[sessionId]` — Full-screen Leaflet map game:
  - Platform chrome (header, sidebar, bottom nav) is hidden via pathname check
  - GPS tracked via `navigator.geolocation.watchPosition`
  - Locations rendered as colored `CircleMarker`: orange (unvisited), gray (visited), green (in range)
  - Tapping a marker opens a `LocationSheet` bottom sheet
  - On entering a location's radius, the sheet opens automatically and the visit is recorded
  - Bottom bar: back arrow, visited/visible count, refresh, settings gear
  - Settings sheet: restart chapter (with confirmation)

---

## Adventure Module — Implementation Notes

These are hard-won lessons from building the map game on mobile.

### Overlay visibility on iOS Safari (the most important one)

`position: fixed` elements placed inside a Leaflet `MapContainer` are **invisible on
iOS Safari**. The map uses `overflow: hidden` on its container, which creates a new
stacking context that clips fixed children. React portals (`createPortal`) also fail
because the portal target is still inside the clipped subtree.

**The fix:** the session page root is `<div className="relative flex flex-col">` with
`height: 100dvh`. All overlays (LocationSheet, settings sheet, visit toast) use
`className="absolute inset-0 z-[2000] flex items-end"`. Being `absolute` inside a
`relative` parent means they escape the map's clipping context and cover the full
viewport correctly.

This pattern must be preserved. Do not change overlay positioning to `fixed` or use
portals.

### Leaflet mobile tap events

On iOS Safari, Leaflet's internal tap plugin and tooltip elements can intercept touch
events before they reach click handlers. The symptom is: markers are clickable on
desktop but tapping them on mobile does nothing.

**The fix:** do not add `Tooltip` components to markers. Use standard
`eventHandlers={{ click: () => handler() }}` on `CircleMarker`. No custom tap
handling, no `DisableTap` wrapper, no `touchend` DOM listeners needed.

### GPS radius

The default Prisma schema value is 30m but gameplay is set to 35m (`radiusM: 35` in
the chapter JSON). 30m is too tight for real GPS accuracy — a player standing at the
exact location often measures 20-40m away due to signal drift.

### Auto-visit on sheet open

When the LocationSheet opens for an in-range unvisited location, it auto-calls the
visit endpoint immediately via a `useEffect` on mount. There is no separate "Visit"
button. This means the flag grants and narrative are applied as soon as the player
reaches the location, which is the intended UX.

---

## Frontend Component Patterns

### Conditional rendering in `useEffect` vs derived values

In the adventure session page, `nearbyLocationIds` is a `Set<string>` derived
synchronously from `playerPos` and `state.locations` on every render. The auto-open
logic lives in a separate `useEffect` that depends on `[playerPos, state]` so it fires
on every GPS update. This separation avoids stale closures.

### Multilingual game content resolution

```ts
type I18nString = string | Record<string, string>

function resolveI18n(value: I18nString | null | undefined, locale: string): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale] ?? value['en'] ?? ''
}
```

`resolvedLocations` is computed via `useMemo([state, locale])` so it re-resolves
automatically when the user changes language without a data refetch.

---

## Tests (Vitest)

Integration tests only, for security-critical logic.

**`__tests__/auth.test.ts`** — register, login, token refresh, logout, expired token
**`__tests__/rbac.test.ts`** — role access, admin bypass, 403 codes
**`__tests__/workout.test.ts`** — CRUD, isPublic toggle, public feed (module disabled but tests intact)
**`__tests__/tracker.test.ts`** — CRUD, isPublic, type filter, public feed

---

## Seed Data

`prisma/seed.ts` creates:

**Core:**
- Roles: master_admin, admin, moderator, user
- Permissions for all active modules from `activeModules[].permissions`
- Default master_admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars
- All permissions assigned to master_admin and admin roles

**Bot community users (10 accounts, idempotent):**
Each has the `user` role with public tracker entries. They also have workout routines
in the database, but since the workout module is currently disabled those routines are
not visible in the UI.

**Game data (not in seed.ts — run separately):**
```bash
npx tsx scripts/import-game.ts \
  --file=scripts/chapter1.json \
  --slug=chapter-1 \
  --chapter=1 \
  --activate
```
