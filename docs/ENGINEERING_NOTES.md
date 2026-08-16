# Engineering Notes

Durable, migration-safe engineering context for this project. This is the
**source of truth** for the kind of hard-won knowledge that would otherwise live
only in a developer's head (or a machine-local AI memory that doesn't survive a
system migration). Keep it committed and current.

> Privacy: this file is git-tracked — never put real deployment values here
> (domains, IPs, emails, secrets). Use placeholders like `yourdomain.com`. See
> the "Privacy — Hard Rules" section of `CLAUDE.md`.

See also: `CLAUDE.md` (conventions + deploy steps) and `docs/how-it-works.html`
(architecture tour for a new engineer).

---

## Module landscape

Feature modules are pluggable; `config/modules.ts` `activeModules` drives the
nav, the seeded permissions, and the RBAC test sweep. Currently active:

- **community** — neighbourhood issue map (report w/ photo, rate-limited; mark-fixed with before/after).
- **adventure** — GPS narrative game (flags, choices, spectator multiplayer).
- **memories** — commemorative profiles (Tiptap rich text, image carousel, QR→PDF, public SSR page + owner editor).
- **events** — community events board (1/rolling-week cap; admins & `events:unlimited` bypass; in-app request queue reviewed in the admin panel; images only, no video).
- **activities** — unified local directory (map + list). **Associations were merged in here** as categories `formal` (official register) / `informal` (rest), keeping richer contact fields (website/facebook/instagram/email + private `taxCode`). This page's layout is the **reference map-app UX** (see below).

Retired: Life Tracker / Workout / Events-v0 (removed long ago); the standalone
**Associations** module (merged into activities, table dropped).

## Reusable building blocks — prefer these over re-implementing

**Server / lib**
- `lib/api.ts` — `parseJson(request, zodSchema)` → typed data or a ready 400 `NextResponse` (pair with `isNextResponse`); `jsonError(code,msg,status)`. The standard `{data}` / `{error,code}` contract.
- `lib/permissions.ts` — `requireAuth` / `requirePermission(req,resource,action)` / `requireAdmin` / `isNextResponse` / `invalidatePermissionCache`, and `userHasPermission(user,resource,action)` (soft boolean, admin-bypass — used e.g. to lift the events weekly cap). 60s per-worker permission cache.
- `lib/richtext/` — `extensions.ts` (`richTextExtensions()`, `EMPTY_DOC` — constrained Tiptap set shared by editor AND server render), `render.ts` (`renderRichText(json)` → safe HTML), `excerpt.ts`.
- `lib/imageResize.ts` — `resizeToBlob(file,{maxDim,type,quality})` client-side canvas downscale.
- `lib/icons.tsx` — `getIcon(name)` **tree-shakeable** registry. Any NEW data-driven icon name (module nav icon, category icon) MUST be added to the `ICONS` map or it falls back to a circle. Never `import * as Icons from 'lucide-react'` (bundles the whole set).
- `lib/navItems.ts` — `buildNavItems(t, isAdmin)`; each manifest's `navItem.labelKey` drives the nav. Adding a module needs no nav-component edit.
- `lib/storage.ts` — `getUploadUrl(key, contentType)` presigned PUT. **Images always upload browser → R2 directly**; the server only signs (never handles file bytes). Validate key namespaces per module (e.g. `memories/<uuid>.jpg`).

**Components**
- `components/RichTextEditor.tsx` — Tiptap WYSIWYG (bold/italic/title/quote/link); labels under `richtext.*` i18n.
- `components/ImageCarousel.tsx`, `components/BottomSheet.tsx` (the one iOS-safe sheet — `absolute`, never `fixed`/portal), `components/ProfileCompletionFields.tsx`.

**Adding a module:** manifest + register in `config/modules.ts` + Prisma model + migration + API routes + pages + i18n (en is authoritative — it/es must match the `Translations` type or the build fails) + add the create-permission to `prisma/seed.ts` `userAllowlist` if users can create.

## Reference map-app UX (Activities page)

The `/activities` layout is the pattern to reuse for any map+list page:
- **Desktop:** split — left ~440px panel (search + category chips + a **2-column card grid** that scrolls) and a **large full-height map** on the right. Hover a card → highlight its pin (no pan); click → detail sheet.
- **Mobile:** **full-bleed map**; search + filter chips float on top; a **horizontal scroll-snap card carousel** floats at the bottom (peeks the next card) and **swiping pans the map** to that pin.
- State split: `activeId` (highlight/pan from hover/swipe) vs `detail` (open sheet from click) vs `panId` (map pan target) so gestures don't fight the sheet.
- Map helpers (`ActivitiesMap`): `PanTo(active)`, `FitBounds` (once per category filter via `key`), selected pin enlarges/raises.

Community is a map+list page that could adopt this; Events has no map yet.

## Prisma migrations — the workflow (IMPORTANT)

`npx prisma migrate dev` is **broken** here: its shadow DB replays all migrations
and an old one fails. **Never use `migrate dev`.** Instead, for each schema change:

1. Edit `prisma/schema.prisma`.
2. `mkdir -p prisma/migrations/<UTC-timestamp>_<name>`
3. `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<...>/migration.sql`
4. `npx prisma migrate deploy` then `npx prisma generate`.
5. **Verify** the columns exist (`psql "$DATABASE_URL" -c "\d <table>"`) — don't trust silently.

**Pitfall:** if you create a migration folder and run `migrate deploy` before the
schema edit has taken (empty diff), that name is recorded in `_prisma_migrations`
as applied. Editing the folder's SQL afterward is then **silently skipped**
("No pending migrations"). Fix: `DELETE FROM _prisma_migrations WHERE migration_name='<name>'` then `migrate deploy` re-applies.

## Deploy / verify (see CLAUDE.md for the canonical steps)

The VPS is both test and prod (deploy-in-place). After each change: `tsc` +
`npm run build` + reload PM2 + `/api/health` + run the test suite with
`NEXT_PUBLIC_APP_URL=http://localhost:3000 npm test`. Use `npm install`, never
`npm ci` (SIGBUS on the low-RAM VPS). Tests are live-server integration tests in
`__tests__/`; en/it/es locales must stay in sync (TS-enforced).

## Current branch

Active work has been on a long-lived feature branch with an open PR to `main`
(not yet merged). It now contains multiple modules + refactors — worth merging
or splitting at some point.
