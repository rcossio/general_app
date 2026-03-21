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

## Before Starting Any Task

Read all `.md` files before doing anything. This includes — but is not limited to — `README.md`, `docs/SPEC.md`, and `docs/DEPLOYMENT.md`. These files define the intended architecture, conventions, and constraints. Code must conform to them, not to whatever pattern already exists in the codebase (existing code may already be wrong).

Scan the project structure first. Check what already exists before creating anything new — test folders, config files, scripts, docs. Do not create a file if one already serves the same purpose.

## Testing

Tests live in `__tests__/`. Always check there first. Run `npm test` before writing anything new. Extend existing tests — never create parallel scripts or separate test files outside `__tests__/`.

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
npx prisma db seed                      # Seed roles, permissions, admin user
npx prisma studio                       # Visual DB browser

# Game content import
npx tsx scripts/import-game.ts --file=scripts/chapter1.json --slug=chapter-1 --chapter=1 --activate

# Production — no deploy script. Run in order on the server:
npm install                                        # if dependencies changed
npx prisma migrate deploy                          # if schema changed
pm2 stop all                                       # must stop before building
npm run build
pm2 reload ecosystem.config.js --update-env        # picks up any .env changes
pm2 save
```

---

## Architecture

**Stack:** Next.js 14 (App Router) + TypeScript (strict) + PostgreSQL + Prisma + Tailwind CSS + Vitest. Single-process monolith deployed on a VPS via PM2 + Nginx.

### Module System

Features are pluggable. Each module has a manifest (`modules/<name>/manifest.ts`) defining nav items, permissions, and API prefix. Active modules are registered in `config/modules.ts`.

- **Life Tracker** and **Adventure** are active.
- **Workout** is disabled: import commented in `config/modules.ts`, routes return 403, DB tables intact.

To enable/disable a module: edit `config/modules.ts`, then run `npx prisma migrate dev`.

### Auth

- **Access token:** JWT, 15 min, stored in React context (memory only — never localStorage).
- **Refresh token:** JWT, 30 days, hashed in DB, sent as httpOnly cookie. Rotated on each refresh.
- Fetch wrapper auto-refreshes on 401 and retries once.
- `lib/auth.ts` — token signing/verification, password hashing.
- `lib/permissions.ts` — `requirePermission(request, resource, action)` RBAC middleware. `master_admin` and `admin` bypass all checks.

### API Design

- All inputs validated with Zod.
- Error shape: `{ error: string, code: string }`.
- Success shape: `{ data: T }`.
- List endpoints support `?page=1&limit=20`.

### Adventure Module

GPS-based location game. Key patterns:

- Location visit: verify ownership → check `visibleWhen` flag condition → verify GPS distance ≤ `radiusM` → apply grants (flags) → return narrative.
- `modules/adventure/haversine.ts` — GPS distance.
- `modules/adventure/condition.ts` — evaluates flag-based visibility conditions.
- **iOS Safari critical:** All overlays on the map page use `absolute` positioning inside a `relative` parent. Never use `position: fixed` or React portals — they get clipped by the Leaflet map container.
- **Leaflet mobile taps:** Do not add `Tooltip` to markers — Leaflet's internal tap plugin intercepts touch events and makes markers unclickable on iOS. Use `eventHandlers={{ click: () => handler() }}` on `CircleMarker` only.
- CircleMarker colors: orange = unvisited, gray = visited, green = in range.
- Multilingual game content (`title`, `name`, `values[].content`) is returned as raw `{ en, it, es }` objects from the API. Resolve to a string on the client with `resolveI18n(value, locale)` (falls back to `en`). Use `useMemo([state, locale])` so it re-resolves on language change without a refetch.

### i18n

Custom `LocaleContext` (no library). Locales: `en`, `it`, `es`. `locales/en.ts` exports the authoritative `Translations` type — all other locales must implement it exactly (missing keys = TypeScript error). Hook: `useLocale()` → `{ t, locale, setLocale }`.

### Testing Setup

- Test DB configured via `TEST_DATABASE_URL` env var.
- Global setup: `__tests__/setup/global.ts` (seed test DB).
- Per-test isolation: `__tests__/setup/each.ts`.
- Helpers in `__tests__/helpers.ts`: `registerAndLogin`, `authHeaders`, `uniqueEmail`.
