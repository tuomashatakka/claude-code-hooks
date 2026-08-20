import chalk from 'chalk'
import { defineTool } from '../registry/tool-registry.ts'
import { softCollapse, extractResultText } from '../render/primitives.ts'
import {
  Badge,
  OUTPUT_BADGE,
  RUNNING_BADGE,
  pushDurationLine,
  renderCard,
  renderColumns,
  renderRuler,
  splitRulerSections,
  TUI_TOKENS

} from '../tui/index.ts'
import type { CardProps } from '../tui/index.ts'
import { simpleHighlight, formatJSON, detectOutputLanguage } from '../render/highlight.ts'
import { parseWcgwTrailer, shortenPath } from '../parsers/wcgw-trailer.ts'
import { agentBrowserOperations, operationBadges } from './browser-operations.ts'
import { renderScreenshot } from '../render/screenshot.ts'
import type { BashInput, WcgwBashCommandInput, RawToolResult } from '../types/tool-io.ts'


chalk.level = 3

type AnyBashInput = BashInput | WcgwBashCommandInput

interface CommandRow {
  text: string;

  /** The separator that *terminates* this row, rendered at the end of it. */
  sep: string;
}

interface CommandParserState {
  rows:    CommandRow[];
  current: string;
  quote:   '"' | "'" | null;
  heredoc: string | null;
}

function pushCommandRow (state: CommandParserState, sep: string): void {
  state.rows.push({ text: state.current.replace(/^\s+|\s+$/g, ''), sep })
  state.current = ''
}

function appendHeredocLine (state: CommandParserState, line: string): boolean {
  if (state.heredoc === null)
    return false
  state.current += (state.current ? '\n' : '') + line
  if (line.trim() === state.heredoc)
    state.heredoc = null
  return true
}

function consumeQuotedCharacter (state: CommandParserState, line: string, index: number): number | null {
  if (!state.quote)
    return null

  const character = line[index]!
  state.current += character
  if (state.quote === '"' && character === '\\' && index + 1 < line.length) {
    state.current += line[index + 1]!
    return index + 1
  }
  if (character === state.quote)
    state.quote = null
  return index
}

function consumeCommandSyntax (state: CommandParserState, line: string, index: number): number | null {
  const character = line[index]!
  if (character === '"' || character === "'") {
    state.quote = character
    state.current += character
    return index
  }

  const here = line.slice(index).match(/^<<-?\s*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1/)
  if (here) {
    state.current += here[0]
    state.heredoc = here[2]!
    return index + here[0].length - 1
  }

  if (character === ';') {
    pushCommandRow(state, ';')
    return index
  }
  if ((character === '&' || character === '|') && line[index + 1] === character) {
    pushCommandRow(state, character + character)
    return index + 1
  }
  return null
}

function consumeCommandLine (state: CommandParserState, line: string, lineIndex: number): void {
  if (appendHeredocLine(state, line))
    return
  if (lineIndex > 0)
    state.current += '\n'

  for (let index = 0; index < line.length; index++) {
    const quotedAt = consumeQuotedCharacter(state, line, index)
    if (quotedAt !== null) {
      index = quotedAt
      continue
    }

    const syntaxAt = consumeCommandSyntax(state, line, index)
    if (syntaxAt !== null) {
      index = syntaxAt
      continue
    }
    state.current += line[index]!
  }
}

/**
 * Splits a command on top-level `;`, `&&` and `||`, ignoring separators inside
 * quotes and heredoc bodies.
 *
 * The separator trails its own row rather than leading the next one, so a
 * chain reads the way it would in a script — `cd $D &&` at the end of a line,
 * the next command starting at the row start:
 *
 *     $ mkdir -p $D &&
 *     cd $D &&
 *     cat reg.ts
 *
 * Heredoc bodies are passed through verbatim. Their content is not shell —
 * splitting a `<<'EOF'` payload on `;` shredded embedded JS/TS across rows and
 * put a stray separator in front of every statement.
 */
function splitCommandRows (cmd: string): CommandRow[] {
  const state: CommandParserState = { rows: [], current: '', quote: null, heredoc: null }
  cmd.split('\n').forEach((line, index) => consumeCommandLine(state, line, index))
  pushCommandRow(state, '')
  return state.rows.filter(row => row.text.length > 0)
}


function commandOf (input: AnyBashInput): string | null {
  const raw = (input as Partial<BashInput & WcgwBashCommandInput>).command ??
    (input as Partial<WcgwBashCommandInput>).action_json
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

/** `$ ` on the first row, separators trailing, every later row flush left. */
function renderCommand (cmd: string): string {
  return splitCommandRows(cmd)
    .map(({ text, sep }, i) => {
      const body = simpleHighlight(text, 'bash') + (sep ? ' ' + chalk.gray(sep) : '')
      return i === 0 ? chalk.gray('$ ') + body : body
    })
    .join('\n')
}

function metadataBadges (status: string | null, cwd: string | null, extra: Record<string, string>): Badge[] {
  const badges: Badge[] = []
  if (status !== null) {
    const ok = (/^(?:0|process exited|completed|success)$/i).test(status.trim())
    badges.push(new Badge({ label: `exit ${status}`, color: ok ? 'brightGreen' : 'brightRed', icon: ok ? '✓' : '⨂' }))
  }
  if (cwd)
    badges.push(new Badge({ label: shortenPath(cwd), color: 'brightBlue', icon: '⌂' }))
  for (const [ key, value ] of Object.entries(extra))
    badges.push(new Badge({ label: `${key} ${value}`, color: 'brightCyan' }))
  return badges
}

function renderOutputSection (text: string, language: ReturnType<typeof detectOutputLanguage>): string {
  const highlighted = simpleHighlight(language === 'json' ? formatJSON(text) : text, language)
  return softCollapse(
    language === 'diff'
      ? highlighted
      : highlighted.split('\n').map(line => renderRuler(line) ?? line)
        .join('\n')
  )
}

type BashSection = ReturnType<typeof splitRulerSections>[number]
type BashLanguage = ReturnType<typeof detectOutputLanguage>

function outputSections (stdout: string, language: BashLanguage): BashSection[] {
  if (!stdout.trim())
    return []
  return language === 'diff'
    ? [{ content: stdout, beginsWithRuler: false }]
    : splitRulerSections(stdout)
}

function attachFooter (specs: CardProps[], footer: Badge[]): void {
  if (!footer.length)
    return
  if (specs.length)
    specs.at(-1)!.footer = footer
  else
    specs.push({ badges: OUTPUT_BADGE, content: '', footer })
}

function screenshotSpecs (cmd: string | null, footer: Badge[]): CardProps[] {
  const specs: CardProps[] = []
  if (cmd)
    specs.push({ badges: RUNNING_BADGE, content: renderCommand(cmd) })
  attachFooter(specs, footer)
  return specs
}

function outputSpecs (
  cmd: string | null,
  sections: BashSection[],
  language: BashLanguage,
  footer: Badge[],
): CardProps[] {
  const specs: CardProps[] = []
  let nextSection          = 0

  if (cmd) {
    const regions: import('../tui/index.ts').CardRegion[] = [{
      content:    renderCommand(cmd),
      background: TUI_TOKENS.card.commandBackground,
    }]
    const first = sections[0]
    if (first && !first.beginsWithRuler) {
      regions.push({ heading: OUTPUT_BADGE, content: renderOutputSection(first.content, language) })
      nextSection = 1
    }
    specs.push({ badges: RUNNING_BADGE, content: regions })
  }

  for (const section of sections.slice(nextSection))
    specs.push({ badges: OUTPUT_BADGE, content: renderOutputSection(section.content, language) })

  attachFooter(specs, footer)
  return specs
}

function renderBashCards (
  cmd: string | null,
  stdout: string,
  footer: Badge[],
  screenshot: string | null,
): string[] {
  if (screenshot)
    return [ ...screenshotSpecs(cmd, footer).map(renderCard), screenshot ]

  const language = detectOutputLanguage(stdout)
  return outputSpecs(cmd, outputSections(stdout, language), language, footer).map(renderCard)
}

defineTool<AnyBashInput, RawToolResult>({
  matches: [ 'Bash', 'mcp__wcgw__BashCommand' ],
  post (_input, result, durationMs): import('../registry/tool-registry.ts').RenderedSection {
    const raw             = extractResultText(result) ?? ''
    const lines: string[] = []

    pushDurationLine(lines, durationMs)

    const cmd                            = commandOf(_input)
    const { stdout, status, cwd, extra } = parseWcgwTrailer(raw)
    const footer                         = metadataBadges(status, cwd, extra)
    const operations                     = cmd ? agentBrowserOperations(splitCommandRows(cmd).map(row => row.text)) : []

    // agent-browser reports a screenshot by printing where it put it. Only its
    // output is searched for one: a command that merely *mentions* a `.png` —
    // `ls`, `git status`, a build log — is not asking for it to be drawn.
    const shot  = operations.length ? renderScreenshot(result, stdout) : null
    const cards = renderBashCards(cmd, stdout, footer, shot)

    if (cards.length)
      lines.push(renderColumns({ items: cards }))

    return { lines, extraBadges: operationBadges(operations) }
  },
})
