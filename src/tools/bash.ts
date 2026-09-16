import { ink } from '../ansi/chalk.ts'
import { detectOutputLanguage, formatJSON, highlight } from '../ansi/highlight.ts'
import type { Language } from '../ansi/highlight.ts'
import { clampLines, omittedNote } from '../ansi/text.ts'
import { displayPath, pickString, resultText } from '../lib/data.ts'
import { agentBrowserOperations, parseWcgwTrailer, splitCommandRows } from '../lib/shell.ts'
import { screenshotCard } from '../render/file-card.ts'
import type { Limit, Render } from '../render/fit.ts'
import {
  badge,
  OUTPUT_BADGE,
  RUNNING_BADGE,
  renderCard,
  renderRuler,
  splitRulerSections,
  stack,
  TUI_TOKENS,
} from '../tui/index.ts'
import type { Badge, CardProps, CardRegion, RulerSection } from '../tui/index.ts'
import type { Json } from '../types.ts'
import { named } from './kit.ts'
import type { ToolRenderer } from './kit.ts'


function commandOf (input: Json): string | null {
  const raw = pickString(input, 'command') ?? (typeof input.action_json === 'string' ? input.action_json : null)
  return raw?.trim() || null
}

/** `$ ` on the first row, separators trailing, every later row flush left. */
function renderCommand (command: string): string {
  return splitCommandRows(command)
    .map(({ text, sep }, index) => (index === 0 ? ink.dim('$ ') : '') + highlight(text, 'bash') + (sep ? ' ' + ink.dim(sep) : ''))
    .join('\n')
}

const EXIT_OK = /^(?:0|process exited|completed|success)$/i

function footerBadges (status: string | null, cwd: string | null, extra: Record<string, string>): Badge[] {
  const ok = status !== null && EXIT_OK.test(status.trim())
  return [
    ...status !== null ? [ badge({ label: `exit ${status}`, color: ok ? 'brightGreen' : 'brightRed', icon: ok ? '✓' : '⨂' }) ] : [],
    ...cwd ? [ badge({ label: displayPath(cwd), color: 'brightBlue', icon: '⌂' }) ] : [],
    ...Object.entries(extra).map(([ key, value ]) => badge({ label: `${key} ${value}`, color: 'brightCyan' })),
  ]
}

export const operationBadges = (operations: readonly string[]): Badge[] =>
  operations.map(operation => badge({ label: operation, color: 'brightBlue', icon: 'ƒ' }))

/** Stdout highlighted by language, with `=== title ===` lines drawn as dividers. */
function renderOutput (text: string, language: Language): string {
  const painted = highlight(text, language)
  return language === 'diff'
    ? painted
    : painted.split('\n').map(line => renderRuler(line) ?? line)
      .join('\n')
}

function outputSections (stdout: string, language: Language): RulerSection[] {
  if (!stdout.trim())
    return []
  return language === 'diff' ? [{ content: stdout, beginsWithRuler: false }] : splitRulerSections(stdout)
}

/** The footer sits on the last card; a metadata-only result still gets an inset to carry it. */
function withFooter (specs: CardProps[], footer: Badge[]): CardProps[] {
  if (!footer.length)
    return specs
  if (!specs.length)
    return [{ badges: OUTPUT_BADGE, content: '', footer }]
  return specs.map((spec, index) => index === specs.length - 1 ? { ...spec, footer } : spec)
}

/** The omission note goes on the last card, so a shrunk chain still ends honestly. */
function withOmitted (specs: CardProps[], omitted: number): CardProps[] {
  if (!omitted)
    return specs

  const note = omittedNote(omitted)
  const last = specs.at(-1)
  if (!last)
    return [{ badges: OUTPUT_BADGE, content: note }]

  const content = typeof last.content === 'string'
    ? last.content + '\n' + note
    : last.content.map((region, index) => index === last.content.length - 1 ? { ...region, content: region.content + '\n' + note } : region)
  return [ ...specs.slice(0, -1), { ...last, content }]
}

/**
 * The command and its first stretch of output share one card; every ruler in
 * the output opens a new card, so `=== section ===` headings stack vertically.
 *
 * The line limit is applied to the whole of stdout *before* it is split, so a
 * message that has to shrink loses its tail sections rather than showing a
 * hundred cards that each say "5 lines omitted".
 */
function outputSpecs (command: string | null, stdout: string, language: Language, limit: Limit): CardProps[] {
  const { text: head, omitted } = clampLines(stdout, limit.lines)
  const sections                = outputSections(head, language)
  const specs: CardProps[]      = []
  let next = 0

  if (command) {
    const regions: CardRegion[] = [{ content: renderCommand(command), background: TUI_TOKENS.card.commandBackground }]
    const first                 = sections[0]
    if (first && !first.beginsWithRuler) {
      regions[0]!.trailingBlank = true
      regions.push({ heading: OUTPUT_BADGE, content: renderOutput(first.content, language) })
      next = 1
    }
    specs.push({ badges: RUNNING_BADGE, content: regions })
  }
  for (const section of sections.slice(next))
    specs.push({ badges: OUTPUT_BADGE, content: renderOutput(section.content, language) })
  return withOmitted(specs, omitted)
}

function renderCards (command: string | null, stdout: string, footer: Badge[], screenshot: Render | null, limit: Limit): string[] {
  if (screenshot) {
    const specs = command ? [{ badges: RUNNING_BADGE, content: renderCommand(command) }] : []
    return [ ...withFooter(specs, footer).map(renderCard), screenshot(limit) ]
  }

  const language = detectOutputLanguage(stdout)
  const body     = language === 'json' ? formatJSON(stdout) : stdout
  return withFooter(outputSpecs(command, body, language, limit), footer).map(renderCard)
}

export const bash: ToolRenderer = {
  id:    'bash',
  match: named('Bash', 'mcp__wcgw__BashCommand'),
  render ({ input, result }, limit) {
    const command                        = commandOf(input)
    const { stdout, status, cwd, extra } = parseWcgwTrailer(resultText(result) ?? '')
    const operations                     = command ? agentBrowserOperations(command) : []

    // agent-browser reports a screenshot by printing where it put it. Only its
    // output is searched: a command that merely *mentions* a `.png` is not
    // asking for it to be drawn.
    const screenshot = operations.length ? screenshotCard(result, stdout) : null
    const cards      = renderCards(command, stdout, footerBadges(status, cwd, extra), screenshot, limit)
    return { lines: [ stack(cards) ], badges: operationBadges(operations) }
  },
}
