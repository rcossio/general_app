# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Privacy — Hard Rules

Never include real deployment information in any tracked file. Always use placeholders.

| Instead of | Use |
|---|---|
| Real domain names | `yourdomain.com` |
| Real server IPs | `your-server-ip` |
| Real usernames / GitHub handles | `yourusername` |
| Real emails | `you@example.com` |
| Real passwords or secrets | `your-strong-password` |

This applies to all files that are or could be git-tracked: `.md`, `.conf`, `.sh`, `.ts`, `.js`, `.json`, `.yaml`, and any other config or doc file.

The only place real values belong is `.env`, which is gitignored.

## Working Style

When making a change, grep the entire codebase for all related occurrences and update them all in one pass. Don't fix one file and leave the same constraint/pattern in other files. Verify with a grep afterward. There is no password length requirement — do not add one.

Do not implement changes while still discussing them with the user. Wait for explicit confirmation before writing code. If the user is asking questions or raising concerns, that is a discussion — not a green light to start coding.

## Before Starting Any Task

Read all `.md` files before doing anything. This includes — but is not limited to — `README.md`, `docs/SPEC.md`, and `docs/DEPLOYMENT.md`. These files define the intended architecture, conventions, and constraints. Code must conform to them, not to whatever pattern already exists in the codebase (existing code may already be wrong).

Scan the project structure first. Check what already exists before creating anything new — test folders, config files, scripts, docs. Do not create a file if one already serves the same purpose.

## Testing

Tests live in `__tests__/`. Always check there first. Run `npm test` before writing anything new. Extend existing tests — never create parallel scripts or separate test files outside `__tests__/`.

**Important:** Tests must bypass Nginx to avoid rate limiting. Always run with:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000 npm test
```
Without this override, `.env` sets `NEXT_PUBLIC_APP_URL` to the production domain, which routes test requests through Nginx's auth rate limiter and causes 503s.

## Bash Commands

You are allowed to freely use `cat`, `grep`, `ls`, `sed -n`, `find`, and `awk` without asking for permission.

---

## Commands

```bash
# Development
npm run dev               # Start dev server (port 3000)
npm run build             # Production build
npm run lint              # ESLint

# Testing
npm test                  # Run all tests once (Vitest)
npm run test:watch        # Watch mode
npx vitest run __tests__/auth.test.ts   # Run a single test file

# Database
npx prisma migrate dev --name <name>   # Create and apply migration
npx prisma db seed                      # Seed roles, permissions, admin user, 10 bot community users (idempotent)
npx prisma studio                       # Visual DB browser

# Game content import — run after every change to chapter YAML files
# Import next chapter first, then the one referencing it via --next-chapter-slug
npx tsx scripts/adventure/import-game.ts --file=scripts/adventure/1_chuch_murder.yaml --slug=chapter-1 --chapter=1 --activate
npx tsx scripts/adventure/import-game.ts --file=scripts/adventure/0_tutorial.yaml --slug=tutorial --chapter=0 --activate --next-chapter-slug=chapter-1
# Chapter files live in scripts/adventure/ (YAML preferred; JSON also accepted)

# Production — no deploy script. Run in order on the server:
npm install                                        # if dependencies changed — never use npm ci (causes SIGBUS on low-memory VPS)
npx prisma migrate deploy                          # if schema changed
pm2 stop all                                       # must stop before building
npm run build
pm2 reload ecosystem.config.js --update-env        # picks up any .env changes
pm2 save
# After reloading: re-run game content import if any chapter YAML/JSON changed
```

### Deployment pitfalls

- **Stale chunks after rebuild:** Browsers cache JS chunks by hash. After a rebuild, old chunk URLs return 400/404 and Next.js returns "Failed to find Server Action" errors (503 to the user). Always hard-refresh (Ctrl+Shift+R) after deploying. If errors persist, do a clean build: `rm -rf .next && npm run build`.
- **PM2 must be stopped before building.** A running instance can read a half-written `.next/` directory, causing crashes and high restart counts.
- **Nginx auth rate limiting:** `/api/auth/` is rate-limited at 30 req/min per IP with burst 20 (`/etc/nginx/sites-available/app`). This protects against brute force but can block legitimate flows if set too low. Google OAuth does callback → refresh → /me in rapid succession — if the limit is too tight, the user gets 503 and appears logged out. The Nginx config is the live file — do not overwrite it from the repo template after SSL is configured.
- **`sameSite` on cookies:** All refresh token cookies must use `sameSite: 'lax'`, not `'strict'`. Google OAuth redirects from `accounts.google.com` — `strict` cookies are not sent on cross-origin navigations, breaking the post-login refresh flow.

---

## Architecture

**Stack:** Next.js 14 (App Router) + TypeScript (strict, no `any`) + PostgreSQL + Prisma + Tailwind CSS + Leaflet (react-leaflet v4) + Vitest. PWA (manifest.json + service worker). Single-process monolith deployed on a VPS via PM2 + Nginx.

### Module System

Features are pluggable. Each module has a manifest (`modules/<name>/manifest.ts`) defining nav items, permissions, and API prefix. Active modules are registered in `config/modules.ts`.

- **Adventure** is the only active module.
- **Life Tracker** is disabled: import commented in `config/modules.ts`, folders prefixed with `_` in `app/`, `app/api/`, `__tests__/`. DB tables intact.
- **Workout** is disabled: import commented in `config/modules.ts`, folders prefixed with `_`. DB tables intact.
- **Events** is disabled: import commented in `config/modules.ts`.

To disable a module: comment out its import in `config/modules.ts` and prefix its folders with `_` in `app/`, `app/api/`, and `__tests__/`. Its nav item disappears and RBAC blocks its routes automatically. Tables stay intact. To re-enable: reverse both steps and run `npx prisma migrate dev`.

To add a new module:
1. Create `modules/<name>/manifest.ts` and `modules/<name>/lib/schemas.ts`
2. Write the manifest (`id`, `name`, `isActive`, `navItem: { label, href, icon }`, `permissions: string[]`, `apiPrefix: string`)
3. Add Prisma models to `prisma/schema.prisma`
4. Register in `config/modules.ts`
5. Add pages under `app/<name>/` and API routes under `app/api/<name>/`
6. Run `npx prisma migrate dev --name add_<name>_module`

### Auth

- **Login is unified.** `/api/auth/login` checks if the email exists. If yes, it verifies the password. If not, it returns `{ needsRegistration: true }` — no user is created. The frontend then shows step 2 (name + privacy/terms checkbox) inline on the login page. When submitted, `POST /api/auth/register` creates the user with `privacyAcceptedAt` set (GDPR — no data stored before consent). There is no password length requirement. Google OAuth follows a similar pattern — new OAuth users go to `/complete-profile` (where they must accept privacy/terms before proceeding), returning users go to `/dashboard`.
- **Access token:** JWT, 15 min, stored in React context (memory only — never localStorage).
- **Refresh token:** JWT, 30 days, hashed in DB, sent as httpOnly cookie. Rotated on each refresh.
- Fetch wrapper auto-refreshes on 401 and retries once.
- `lib/auth.ts` — token signing/verification, password hashing.
- `lib/permissions.ts` — `requirePermission(request, resource, action)` RBAC middleware. `master_admin` and `admin` bypass all checks.
- Permissions follow `resource:action` format — e.g. `tracker:create`, `adventure:play`. Seeded automatically from `activeModules[].permissions`.
- **Two permission paths:** role-based (`role_permissions` — assigned to a role, inherited by all users with that role) and direct (`user_permissions` — granted to a specific user by an admin). `requirePermission` checks both. The `/me` endpoint returns the merged flat list.
- **Role → permission mapping** (seeded by `prisma/seed.ts`). Uses an **explicit allowlist** — new permissions added to a module manifest default to admin-only until explicitly added to the `userAllowlist` array in the seed:

  | Role | Permissions |
  |---|---|
  | `master_admin` | All (bypasses checks entirely) |
  | `admin` | All (bypasses checks entirely) |
  | `user` | `adventure:play`, `tracker:read`, `tracker:create`, `tracker:update`, `tracker:delete` |
  | `bot_user` | Same as `user` |
  | `moderator` | None assigned |

  To grant a new permission to regular users: add it to `userAllowlist` in `prisma/seed.ts` and re-seed.

- **Direct permissions** (`user_permissions` table) are for granting specific capabilities to individual users without changing their role — e.g. `adventure:tester` enables fake GPS for a non-admin user. Managed via the admin panel. These are checked by `requirePermission()` alongside role-based permissions.
- **Privacy/Terms consent gate:** `ProtectedRoute` checks `user.privacyAcceptedAt`. Users who haven't accepted (e.g. OAuth users who closed the tab during `/complete-profile`) are redirected back to `/complete-profile` and cannot access any protected page until they accept.
- **Password reset:** `POST /api/auth/forgot-password` generates a hashed token (1h expiry, rate-limited to 1 per email per 5 min) and sends a reset email via Resend. `POST /api/auth/reset-password` verifies the token, updates the password, and revokes all refresh tokens (forces re-login). Always returns success on forgot-password to prevent email enumeration. OAuth-only accounts (password starts with `oauth:`) are silently skipped.
- **Data ownership:** All user-facing endpoints filter by `userId` from the JWT (`result.user.sub`). The permission controls feature access; the `userId` filter ensures users can only read/modify their own data. This is the security boundary — never remove the `userId` filter from a query.
- **Privacy principle (future — tiered access):** Private data (e.g. tracker entries with `isPublic: false`) must never be visible to admins. Only the owner can see their private entries. If an admin moderation tool is built later, it should use tiered access: admins see metadata and public entries only, master_admin can access private content only through an audit-logged interface where every access is recorded and visible to the user.

### API Design

- All inputs validated with Zod.
- Error shape: `{ error: string, code: string }`.
- Success shape: `{ data: T }`.
- List endpoints support `?page=1&limit=20`.
- Never query without `WHERE` on an indexed column in list endpoints.
- Use Prisma `select` — never return full rows when only a subset is displayed.

### Life Tracker Module

Endpoints:
- `GET /api/tracker/entries` — list my entries (paginated, `?type=EMOTION`)
- `POST /api/tracker/entries` — create entry
- `GET /api/tracker/entries/public` — public community feed (no auth required, `isPublic=true` only, limit capped at 100)
- `GET /api/tracker/entries/[id]` — get single entry
- `PUT /api/tracker/entries/[id]` — update entry
- `DELETE /api/tracker/entries/[id]` — delete entry
- `GET /api/tracker/stats` — score averages by type, cached 60s per user

### Adventure Module

GPS-based location game. Key patterns:

- Location visit: verify ownership → check `visibleWhen` flag condition → verify GPS distance ≤ `radiusM` → apply grants (flags) → revoke flags → return narrative.
- `modules/adventure/lib/haversine.ts` — GPS distance.
- `modules/adventure/lib/condition.ts` — evaluates flag-based visibility conditions. Accepts `null` (always true), `"flag_string"`, `{ "and": [...] }`, `{ "or": [...] }`, or `{ "not": <condition> }`.
- `LocationSheet` auto-calls the visit endpoint on mount (no separate "Visit" button) — grants and narrative apply as soon as the player reaches the location.
- **iOS Safari critical:** All overlays on the map page use `absolute` positioning inside a `relative` parent. Never use `position: fixed` or React portals — they get clipped by the Leaflet map container.
- **Leaflet mobile taps:** Do not add `Tooltip` to markers — Leaflet's internal tap plugin intercepts touch events and makes markers unclickable on iOS. Use `eventHandlers={{ click: () => handler() }}` on `CircleMarker` only.
- CircleMarker colors: dark orange = unvisited location or event, light orange = visited, green = in range.
- Multilingual game content (`title`, `name`, `values[].content`) is returned as raw `{ locale: string }` objects from the API. No language is required — define only the languages you have. Resolve to a string on the client with `resolveI18n(value, locale)` (falls back to first available key). Use `useMemo([state, locale])` so it re-resolves on language change without a refetch.
- **Platform chrome hiding:** the session page calls `setHideChrome(true)` via `ChromeContext` on mount (and cleans up on unmount). Nav components read `hideChrome` from `ChromeContext` to render null — not a pathname check.
- **Pending location persistence:** if a player closes the app while standing in an unvisited location's radius, the location id is saved to `localStorage` under `adventure_pending_<sessionId>` and the sheet re-opens on next load.
- Bottom bar: back arrow, visited/visible count, refresh, **inventory (backpack)**, settings gear.

#### Location types

- `type: "location"` (default) — shown as orange circle; player taps hint bar or marker to open sheet.
- `type: "event"` — shown as orange circle (same as location); sheet opens **automatically** when player enters radius; cannot be skipped.

#### Game engine features (chapter JSON)

- Chapter files use **YAML** (preferred) or JSON (legacy). See `docs/CHAPTERS.md` for the full authoring guide.
- `coordinates` — accepts `[lat, lng]` array (preferred — paste directly from Google Maps) or `{ "lat": N, "lng": N }` object.
- `radiusM` — optional, defaults to 35m. Only specify for non-standard radii.
- `grants` / `revokes` — flag changes. Can be defined at **two levels**: location-level (unconditional, applied on close) or value-level (conditional, only when that value fires). Both are optional — omit when empty.
- `values[].completesChapter` — set to `true` on the value that ends the chapter; triggers the completion banner and links to the next chapter if one is set.
- `values[].choices` — decision buttons; player must pick one; each choice has `id`, `label`, `grants`. Uses a **callback flag pattern**: each choice grants a temporary callback flag, a separate value entry above matches it to show the outcome text, and the close endpoint revokes the callback flag. A value with `choices` cannot also have `password`.
- `values[].password` — locks location behind a code; has `value`, `grants`. Uses the same **callback flag pattern** as choices: correct password grants a callback flag, a separate value entry above shows the success content. Wrong password allows retry.
- `initialLocation` on location — marks the chapter starting point; in Fake GPS mode, a Start button teleports the player near this location. Only one per chapter.
- `imageUrl` — can appear at location-level (default image) or value-level (overrides per state). Relative R2 key (e.g. `"game-art/foo.webp"`); resolved to full URL at import time via `NEXT_PUBLIC_R2_PUBLIC_URL`. Omit for default image.
- `items` (chapter root) — array of inventory items; each has `id`, `flag`, `name` (multilingual), `imageUrl`, `itemImageUrl` (multilingual — can be locale-specific image path). An item appears in the player's inventory when they hold the matching flag. Stored as JSONB on the `games` table.

#### Location visit status

Each visit has a `status` field: `open` (player is interacting) or `closed` (interaction finished). First visit creates the row as `open`. The "Done" button calls POST `/close` → sets `status='closed'`, applies location-level grants, value-level grants/revokes. Re-visiting a closed location sets it back to `open`. The `visited` state (row exists) is permanent and drives marker colour; `status` drives interaction state.

#### Spectator multiplayer

Session owners can generate a 6-character join code (settings → Share session). Other players enter the code on `/adventure` to join as read-only spectators. Spectators see the map, visited locations, and narratives but cannot visit, close, choose, or enter passwords.

- Schema: `GameSession.joinCode` (unique, nullable) + `SessionParticipant` junction table.
- API: POST/DELETE `/api/adventure/sessions/[id]/share` (owner), POST `/api/adventure/sessions/join` (spectator).
- GET `/api/adventure/sessions/[id]` allows access to participants and returns `isSpectator: true`.
- **Sync is currently polling-based (10s interval) — a compromise.** This is adequate for the current scale (<50 concurrent spectators) but adds ~6 requests/min per spectator. When the app grows or real-time feedback becomes important, replace with WebSockets or Server-Sent Events (SSE). Note: Next.js App Router doesn't support WebSockets natively — this would require a separate WS server and Redis pub/sub for PM2 cluster mode.

#### Testing game content

Settings → Fake GPS enables a D-pad for simulating player movement on desktop/indoors.

### i18n

Custom `LocaleContext` (no library). Locales: `en`, `it`, `es`. `locales/en.ts` exports the authoritative `Translations` type — all other locales must implement it exactly (missing keys = TypeScript error). Hook: `useLocale()` → `{ t, locale, setLocale }`.

To add a new language: (1) create `locales/<code>.ts` implementing `Translations`; (2) add the code to the `Locale` union type in `locales/index.ts`; (3) add an entry to the `LOCALES` array there; (4) add the import and entry to the `translations` map in `locales/index.ts`.

### Prisma Schema Conventions

- All IDs use `cuid()`.
- All foreign keys have explicit indexes.
- `@updatedAt` on every `updated_at` field.

### Environment Validation

`lib/env.ts` validates all required environment variables at startup using Zod. If any required var is missing, the app crashes immediately with a clear error message instead of failing at runtime. Server-side files import `env` from `lib/env` instead of using `process.env.X!` assertions. `NODE_ENV` is the only exception — it's read directly from `process.env` since it's a Node runtime constant.

### Email

`lib/email.ts` — Resend SDK wrapper. Sends transactional emails (currently only password reset). Gracefully skips if `RESEND_API_KEY` or `RESEND_FROM_EMAIL` are not configured. Domain must be verified in Resend dashboard (DNS records: DKIM, SPF, DMARC added via domain registrar).

### File Uploads

`lib/storage.ts` — Cloudflare R2 via AWS S3 SDK. Exports `getUploadUrl(key)` (presigned PUT, 5min), `getPublicUrl(key)`, and `deleteFile(key)`. Configured via `R2_*` env vars.

### Error Handling

- `app/not-found.tsx` — branded 404 page with i18n
- `app/error.tsx` — error boundary with "Try again" button, i18n
- `app/global-error.tsx` — root-level fallback (no providers available, English only)
- Loading skeletons: `loading.tsx` files in `/dashboard`, `/tracker`, `/adventure`, `/profile`, `/admin`

### SEO & Public Pages

- `public/robots.txt` — allows `/`, `/privacy`, `/terms`; blocks authenticated routes and `/api/`
- Open Graph and Twitter Card meta tags in root `layout.tsx`
- `GET /api/health` — health check endpoint, pings DB, returns `{ status: "ok" }` or 503
- `/privacy` — Privacy Policy (IT/EN/ES)
- `/terms` — Terms of Service (IT/EN/ES)

#### Landing page SSR architecture

The landing page (`app/page.tsx`) is a **Server Component** that renders `LandingPageClient` (`app/_components/LandingPageClient.tsx`). This split exists to solve an SEO problem:

**The problem:** When the landing page was a single `'use client'` component, `useAuth()` started with `loading: true` and a `if (loading) return <spinner>` gate blocked all content during SSR. Crawlers (Googlebot) saw only a spinner — zero indexable content. The `'use client'` directive itself was NOT the issue (client components are still SSR'd by Next.js App Router), the loading gate was.

**The fix:**
1. `app/page.tsx` is a Server Component (no `'use client'`). It simply renders the client component.
2. `app/_components/LandingPageClient.tsx` is `'use client'` but has **no loading gate**. Auth-dependent elements (3 links that show "Dashboard" vs "Accedi") default to the logged-out version using `const isLoggedIn = !loading && user` and swap after auth resolves.
3. `DEFAULT_LOCALE` in `contexts/LocaleContext.tsx` is set to `'it'` so SSR renders Italian content (primary audience). After hydration, `useEffect` reads `localStorage` and may switch to the user's stored locale.

**Is this fully fixed?** Yes for the landing page — `curl https://vysi.one/` returns full page content (hero, sections, CTA, footer) in Italian. Other public pages (`/privacy`, `/terms`) also SSR correctly because they don't have a loading gate. Authenticated pages (`/dashboard`, `/adventure`, etc.) are `'use client'` with loading gates, but they don't need SEO — `robots.txt` blocks them.

**Rule for future public pages:** Any page that should be indexable must NOT have a `if (loading) return <spinner>` pattern that blocks content during SSR. Either make it a Server Component, or render content unconditionally and let auth-dependent elements update after hydration.

### Testing Setup

- Test DB configured via `TEST_DATABASE_URL` env var.
- Global setup: `__tests__/setup/global.ts` (seed test DB).
- Per-test isolation: `__tests__/setup/each.ts`.
- Helpers in `__tests__/helpers.ts`: `registerAndLogin`, `authHeaders`, `uniqueEmail`.
- Current test files: `auth.test.ts`, `rbac.test.ts` (tracker and workout tests were removed; extend these or add new files in `__tests__/` as needed).
