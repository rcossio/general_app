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
  successContent: I18n
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

function stateKey(chapterIdx: number, flags: Set<string>, visited: Set<string>): string {
  return `${chapterIdx}|${[...flags].sort().join(',')}|${[...visited].sort().join(',')}`
}

// ─── Path types ───────────────────────────────────────────────────────────

interface Step {
  chapter: string
  location: string
  type: string
  narrative: string
  choice?: string         // label of chosen option
  outcome?: string        // text shown after choice / password
  password?: string       // the code itself
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
  visited: Set<string>,
  steps: Step[],
  results: StoryPath[],
  seen: Set<string>,
): void {
  if (results.length >= MAX_PATHS) return

  const chapter = chapters[chapterIdx]
  if (!chapter) return

  // Dedup: same (chapter, flags, visited) → same future stories
  const key = stateKey(chapterIdx, flags, visited)
  if (seen.has(key)) return
  seen.add(key)

  const available = chapter.locations.filter(
    loc => !visited.has(loc.id) && evaluate(loc.visibleWhen, flags)
  )

  if (available.length === 0) {
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

    const newVisited = new Set(visited)
    newVisited.add(loc.id)

    const gained = [
      ...loc.grants.map(g => g.flag),
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
          dfs(chapters, nextIdx, f, new Set(), s, results, seen)
        } else {
          results.push({ steps: s, endFlags: [...f].sort() })
        }
      } else {
        dfs(chapters, chapterIdx, f, newVisited, s, results, seen)
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
      const pwdFlags = applyGrants(newFlags, value.password.grants)
      const step: Step = {
        chapter: t(chapter.title),
        location: t(loc.name),
        type: loc.type ?? 'location',
        narrative: t(value.content),
        password: value.password.value,
        outcome: t(value.password.successContent),
        gained: [...gained, ...value.password.grants.map(g => g.flag)],
        lost,
      }
      continueOrEnd(pwdFlags, [...steps, step])
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
  let lastChapter = ''

  for (const step of p.steps) {
    if (step.chapter !== lastChapter) {
      lines.push(`### ${step.chapter}`, '')
      lastChapter = step.chapter
    }

    const badge = step.type === 'event' ? ' `[EVENT]`' : ''
    lines.push(`**${step.location}**${badge}`)
    lines.push('')

    // Wrap narrative in blockquote, preserving line breaks
    const narLines = step.narrative.split(/\n/)
    narLines.forEach(l => lines.push(`> ${l}`))
    lines.push('')

    if (step.choice !== undefined) {
      lines.push(`*→ Choice: **${step.choice}***`)
      if (step.outcome) lines.push(`*${step.outcome}*`)
      lines.push('')
    }
    if (step.password !== undefined) {
      lines.push(`*→ Password: \`${step.password}\`*`)
      if (step.outcome) lines.push(`*${step.outcome}*`)
      lines.push('')
    }

    const gained = step.gained.filter(Boolean)
    const lost = step.lost.filter(Boolean)
    if (gained.length || lost.length) {
      const parts: string[] = []
      if (gained.length) parts.push(`+${gained.join(', ')}`)
      if (lost.length) parts.push(`−${lost.join(', ')}`)
      lines.push(`\`flags: ${parts.join(' | ')}\``, '')
    }
  }

  lines.push(`**End flags:** \`${p.endFlags.join(', ') || '(none)'}\``)
  lines.push('', '---', '')
  return lines.join('\n')
}

// ─── Main ─────────────────────────────────────────────────────────────────

const dir = path.join(__dirname)

const chapterFiles: { file: string; nextSlug: string | null }[] = [
  { file: '0_tutorial.json',     nextSlug: 'chapter-1' },
  { file: '1_chuch_murder.json', nextSlug: null },
]

const chapters: Chapter[] = chapterFiles.map(({ file, nextSlug }) => {
  const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
  const data = JSON.parse(raw) as ChapterFile
  return { ...data, slug: file.replace('.json', ''), nextSlug }
})

const results: StoryPath[] = []
dfs(chapters, 0, new Set(), new Set(), [], results, new Set())

const output = [
  '# Adventure Story Paths',
  '',
  `> Language: \`${lang}\` — Generated from **${chapters.map(c => t(c.title)).join(' → ')}**`,
  `> Found **${results.length}** unique path(s). Capped at ${MAX_PATHS}.`,
  '',
  '---',
  '',
  ...results.map((p, i) => renderPath(p, i)),
].join('\n')

const outPath = path.join(dir, 'paths.md')
fs.writeFileSync(outPath, output, 'utf-8')
console.log(`${results.length} path(s) written to ${outPath}`)
