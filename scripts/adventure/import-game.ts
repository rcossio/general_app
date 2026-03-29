/**
 * Import a game from a JSON file into the database.
 *
 * Usage:
 *   npx tsx scripts/import-game.ts \
 *     --file=scripts/chapter1.json \
 *     --slug=chapter-1 \
 *     --title="Chapter 1: The Garden" \
 *     --chapter=1 \
 *     [--description="..."] \
 *     [--next-chapter-slug=chapter-2] \
 *     [--activate]
 *
 * The JSON format expected:
 * {
 *   "locations": [
 *     {
 *       "id": "loc_1_start",           // unique within game, used as externalId
 *       "name": "Notice Board",
 *       "coordinates": { "lat": 45.01, "lng": 8.62 },
 *       "visibleWhen": null | "flag" | { "and": [...] } | { "or": [...] },
 *       "values": [
 *         {
 *           "when": null | "flag" | { "and": [...] } | { "or": [...] },
 *           "content": "Narrative text shown to player",
 *           "completesChapter": true   // optional — marks this as the win condition
 *         }
 *       ],
 *       "grants": [{ "flag": "flag_name" }]
 *     }
 *   ]
 * }
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Resolves an R2 key or object of keys to full public URLs.
// Values that already start with "http" are left unchanged.
type MaybeI18n = string | Record<string, string> | null | undefined
function resolveR2(value: MaybeI18n): MaybeI18n {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  if (!value || !base) return value ?? null
  if (typeof value === 'string') {
    return value.startsWith('http') ? value : `${base}/${value}`
  }
  const resolved: Record<string, string> = {}
  for (const [k, v] of Object.entries(value)) {
    resolved[k] = v.startsWith('http') ? v : `${base}/${v}`
  }
  return resolved
}

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {}
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, ...rest] = arg.slice(2).split('=')
      args[key] = rest.join('=')
    }
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv)

  const file = args['file']
  const slug = args['slug']
  const chapter = parseInt(args['chapter'] ?? '1', 10)
  const description = args['description']
  const nextChapterSlug = args['next-chapter-slug']
  const activate = 'activate' in args

  if (!file || !slug) {
    console.error('Usage: npx tsx scripts/import-game.ts --file=<path> --slug=<slug> [--title=<en-title>] [--chapter=N] [--description=...] [--next-chapter-slug=<slug>] [--activate]')
    process.exit(1)
  }

  const filePath = path.resolve(file)
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  const raw = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(raw) as {
    title?: Record<string, string>
    items?: Array<{
      id: string
      flag: string
      name: Record<string, string>
      imageUrl?: string | null
      itemImageUrl?: string | Record<string, string> | null
    }>
    locations: Array<{
      id: string
      type?: string
      imageUrl?: string
      name: Record<string, string>
      coordinates: { lat: number; lng: number }
      radiusM?: number
      visibleWhen: unknown
      values: unknown
      grants: unknown
      revokes?: unknown
      initialLocation?: boolean
    }>
  }

  if (!Array.isArray(data.locations)) {
    console.error('JSON must have a "locations" array')
    process.exit(1)
  }

  const title = data.title
  if (!title || typeof title !== 'object' || Object.keys(title).length === 0) {
    console.error('JSON must have a "title" object with at least one language key')
    process.exit(1)
  }

  // Resolve next chapter id
  let nextGameId: string | null = null
  if (nextChapterSlug) {
    const next = await prisma.game.findUnique({ where: { slug: nextChapterSlug } })
    if (!next) {
      console.error(`next-chapter-slug "${nextChapterSlug}" not found. Import that chapter first.`)
      process.exit(1)
    }
    nextGameId = next.id
  }

  // Resolve R2 keys in items to full URLs
  const resolvedItems = (data.items ?? []).map((item) => ({
    ...item,
    itemImageUrl: resolveR2(item.itemImageUrl) ?? null,
  }))

  // Upsert game
  const game = await prisma.game.upsert({
    where: { slug },
    update: {
      title,
      description: description ?? undefined,
      chapter,
      isActive: activate || undefined,
      nextGameId: nextGameId ?? undefined,
      items: resolvedItems as never,
    },
    create: {
      slug,
      title,
      description,
      chapter,
      isActive: activate,
      nextGameId,
      items: resolvedItems as never,
    },
  })

  const titleEn = Object.values(game.title as Record<string, string>)[0] ?? JSON.stringify(game.title)
  console.log(`Game "${titleEn}" (${game.slug}) — id: ${game.id}`)

  // Remove locations that are no longer in the JSON
  const incomingIds = data.locations.map((l) => l.id)
  const deleted = await prisma.gameLocation.deleteMany({
    where: { gameId: game.id, externalId: { notIn: incomingIds } },
  })
  if (deleted.count > 0) {
    console.log(`  Removed ${deleted.count} stale location(s)`)
  }

  // Upsert locations
  for (let i = 0; i < data.locations.length; i++) {
    const loc = data.locations[i]
    await prisma.gameLocation.upsert({
      where: { gameId_externalId: { gameId: game.id, externalId: loc.id } },
      update: {
        type: loc.type ?? 'location',
        imageUrl: (resolveR2(loc.imageUrl) as string | null) ?? null,
        name: loc.name,
        lat: loc.coordinates.lat,
        lng: loc.coordinates.lng,
        ...(loc.radiusM !== undefined ? { radiusM: loc.radiusM } : {}),
        visibleWhen: loc.visibleWhen ?? null,
        values: loc.values as never,
        grants: loc.grants as never,
        revokes: (loc.revokes ?? []) as never,
        order: i,
        initialLocation: loc.initialLocation ?? false,
      },
      create: {
        type: loc.type ?? 'location',
        imageUrl: (resolveR2(loc.imageUrl) as string | null) ?? null,
        gameId: game.id,
        externalId: loc.id,
        name: loc.name,
        lat: loc.coordinates.lat,
        lng: loc.coordinates.lng,
        ...(loc.radiusM !== undefined ? { radiusM: loc.radiusM } : {}),
        visibleWhen: loc.visibleWhen ?? null,
        values: loc.values as never,
        grants: loc.grants as never,
        revokes: (loc.revokes ?? []) as never,
        order: i,
        initialLocation: loc.initialLocation ?? false,
      },
    })
    console.log(`  [${i + 1}/${data.locations.length}] ${Object.values(loc.name)[0] ?? loc.id} (${loc.id})`)
  }

  if (!game.isActive) {
    console.log('\nGame imported but NOT yet active. To activate, run with --activate flag or set isActive=true in the DB.')
  } else {
    console.log('\nGame is active and ready to play.')
  }

  console.log(`\nDone. ${data.locations.length} locations imported.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
