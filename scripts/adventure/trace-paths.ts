/**
 * Traces all unique story paths through the adventure chapters.
 *
 * Usage:
 *   npx tsx scripts/adventure/trace-paths.ts
 *   npx tsx scripts/adventure/trace-paths.ts --lang=it
 *
 * Output: scripts/adventure/paths.md
 *
 * ── Why no infinite loops? ────────────────────────────────────────────────
 * Each location can only be visited once per session (enforced by the DB
 * unique constraint on session_id + location_id). So the visited-set grows
 * monotonically and the search is guaranteed to terminate.
 *
 * ── State deduplication ───────────────────────────────────────────────────
 * Two different visit orderings that result in the same (flags, visited)
 * state produce identical stories from that point on. We deduplicate by
 * state key so we don't report the same narrative twice.
 */

import * as fs from 'fs'
import * as path from 'path'
import { parse as parseYaml } from 'yaml'
import { evaluate, type Condition } from '../../modules/adventure/lib/condition'

// ─── Types ────────────────────────────────────────────────────────────────

type I18n = string | Record<string, string>

interface Grant { flag: string }

interface Choice {
  id: string
  label: I18n
  outcome: I18n
  grants: Grant[]
}

interface Password {
  value: string
  grants: Grant[]
}

interface LocValue {
  when: Condition
  content: I18n
  completesChapter?: boolean
  grants?: Grant[]
  revokes?: Grant[]
  choices?: Choice[]
  password?: Password
}

interface Location {
  id: string
  name: I18n
  type?: string
  visibleWhen: Condition
  values: LocValue[]
  grants: Grant[]
  revokes?: Grant[]
}

interface ChapterFile {
  title: I18n
  locations: Location[]
}

interface Chapter extends ChapterFile {
  slug: string
  nextSlug: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────

const lang = process.argv.find(a => a.startsWith('--lang='))?.split('=')[1] ?? 'en'

function t(val: I18n | null | undefined): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  return val[lang] ?? val['en'] ?? Object.values(val)[0] ?? ''
}

function firstMatch(values: LocValue[], flags: Set<string>): LocValue | null {
  return values.find(v => evaluate(v.when, flags)) ?? null
}

function applyGrants(flags: Set<string>, list: Grant[] | undefined): Set<string> {
  if (!list?.length) return flags
  const next = new Set(flags)
  list.forEach(g => next.add(g.flag))
  return next
}

function applyRevokes(flags: Set<string>, list: Grant[] | undefined): Set<string> {
  if (!list?.length) return flags
  const next = new Set(flags)
  list.forEach(r => next.delete(r.flag))
  return next
}

function stateKey(chapterIdx: number, flags: Set<string>): string {
  return `${chapterIdx}|${[...flags].sort().join(',')}`
}

// ─── Path types ───────────────────────────────────────────────────────────

interface Step {
  chapter: string
  location: string
  type: string
  narrative: string
  choice?: string         // label of chosen option
  outcome?: string        // text shown after choice / password
  password?: string       // the code itself (undefined = skipped/wrong)
  gained: string[]
  lost: string[]
}

interface StoryPath {
  steps: Step[]
  endFlags: string[]
}

// ─── DFS ─────────────────────────────────────────────────────────────────

const MAX_PATHS = 1000

function dfs(
  chapters: Chapter[],
  chapterIdx: number,
  flags: Set<string>,
  steps: Step[],
  results: StoryPath[],
  seen: Set<string>,
): void {
  if (results.length >= MAX_PATHS) return

  const chapter = chapters[chapterIdx]
  if (!chapter) return

  // Dedup: same (chapter, flags) → same future stories regardless of visit order
  const key = stateKey(chapterIdx, flags)
  if (seen.has(key)) return
  seen.add(key)

  const available = chapter.locations.filter(
    loc => evaluate(loc.visibleWhen, flags)
  )

  // Dead end: no location can advance the flag state
  const canProgress = available.some(loc => {
    const value = firstMatch(loc.values, flags)
    if (!value) return false
    let nf = applyGrants(flags, loc.grants)
    nf = applyRevokes(nf, loc.revokes)
    nf = applyGrants(nf, value.grants)
    nf = applyRevokes(nf, value.revokes)
    if (value.choices?.length) return value.choices.some(c => stateKey(chapterIdx, applyGrants(nf, c.grants)) !== key)
    if (value.password) return stateKey(chapterIdx, applyGrants(nf, value.password.grants)) !== key
    return stateKey(chapterIdx, nf) !== key
  })

  if (!canProgress) {
    results.push({ steps: [...steps], endFlags: [...flags].sort() })
    return
  }

  for (const loc of available) {
    const value = firstMatch(loc.values, flags)
    if (!value) continue

    // Apply location-level + value-level grants/revokes
    let newFlags = applyGrants(flags, loc.grants)
    newFlags = applyRevokes(newFlags, loc.revokes)
    newFlags = applyGrants(newFlags, value.grants)
    newFlags = applyRevokes(newFlags, value.revokes)

    const gained = [
      ...(loc.grants ?? []).map(g => g.flag),
      ...(value.grants ?? []).map(g => g.flag),
    ]
    const lost = [
      ...(loc.revokes ?? []).map(g => g.flag),
      ...(value.revokes ?? []).map(g => g.flag),
    ]

    const continueOrEnd = (f: Set<string>, s: Step[]) => {
      if (value.completesChapter) {
        const nextIdx = chapterIdx + 1
        if (nextIdx < chapters.length) {
          dfs(chapters, nextIdx, f, s, results, seen)
        } else {
          results.push({ steps: s, endFlags: [...f].sort() })
        }
      } else {
        dfs(chapters, chapterIdx, f, s, results, seen)
      }
    }

    if (value.choices?.length) {
      for (const choice of value.choices) {
        const choiceFlags = applyGrants(newFlags, choice.grants)
        const step: Step = {
          chapter: t(chapter.title),
          location: t(loc.name),
          type: loc.type ?? 'location',
          narrative: t(value.content),
          choice: t(choice.label),
          outcome: t(choice.outcome),
          gained: [...gained, ...choice.grants.map(g => g.flag)],
          lost,
        }
        continueOrEnd(choiceFlags, [...steps, step])
      }
    } else if (value.password) {
      // Branch 1: correct password — grants callback flag, then DFS continues
      const pwdFlags = applyGrants(newFlags, value.password.grants)
      const stepSolved: Step = {
        chapter: t(chapter.title),
        location: t(loc.name),
        type: loc.type ?? 'location',
        narrative: t(value.content),
        password: value.password.value,
        gained: [...gained, ...value.password.grants.map(g => g.flag)],
        lost,
      }
      continueOrEnd(pwdFlags, [...steps, stepSolved])
      // Branch 2: wrong / skipped password
      const stepSkipped: Step = {
        chapter: t(chapter.title),
        location: t(loc.name),
        type: loc.type ?? 'location',
        narrative: t(value.content),
        outcome: '(password not solved)',
        gained,
        lost,
      }
      continueOrEnd(newFlags, [...steps, stepSkipped])
    } else {
      const step: Step = {
        chapter: t(chapter.title),
        location: t(loc.name),
        type: loc.type ?? 'location',
        narrative: t(value.content),
        gained,
        lost,
      }
      continueOrEnd(newFlags, [...steps, step])
    }
  }
}

// ─── Render ───────────────────────────────────────────────────────────────

function renderPath(p: StoryPath, i: number): string {
  const lines: string[] = [`## Path ${i + 1}`, '']

  for (const step of p.steps) {
    const narrative = step.narrative.replace(/\n+/g, ' ')
    let line = `**${step.location}** ${narrative}`
    if (step.choice !== undefined) {
      line += ` *→ ${step.choice}*`
      if (step.outcome) line += ` ${step.outcome}`
    }
    if (step.password !== undefined) {
      line += ` *→ password \`${step.password}\`: ${step.outcome}`
    } else if (step.outcome === '(password not solved)') {
      line += ` *(password skipped)*`
    }
    lines.push(line, '')
  }

  lines.push('---', '')
  return lines.join('\n')
}

// ─── Main ─────────────────────────────────────────────────────────────────

const fileArg = process.argv.find(a => a.startsWith('--file='))?.split('=')[1]
if (!fileArg) {
  console.error('Usage: npx tsx scripts/adventure/trace-paths.ts --file=<path-to-chapter.yaml> [--lang=en]')
  process.exit(1)
}

const filePath = path.resolve(fileArg)
const raw = fs.readFileSync(filePath, 'utf-8')
const ext = path.extname(filePath).toLowerCase()
const data = (ext === '.yaml' || ext === '.yml' ? parseYaml(raw) : JSON.parse(raw)) as ChapterFile
const slug = path.basename(filePath).replace(/\.(yaml|yml|json)$/, '')
const chapters: Chapter[] = [{ ...data, slug, nextSlug: null }]

const results: StoryPath[] = []
dfs(chapters, 0, new Set(), [], results, new Set())

const output = [
  '# Adventure Story Paths',
  '',
  `> Language: \`${lang}\` — Generated from **${t(chapters[0].title)}**`,
  '',
  `> Found **${results.length}** unique path(s). Capped at ${MAX_PATHS}.`,
  '',
  '---',
  '',
  ...results.map((p, i) => renderPath(p, i)),
].join('\n')

const outPath = path.join(path.dirname(filePath), 'paths.md')
fs.writeFileSync(outPath, output, 'utf-8')
console.log(`${results.length} path(s) written to ${outPath}`)
