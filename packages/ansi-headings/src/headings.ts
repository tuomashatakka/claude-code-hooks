import chalk, { type ColorName } from 'chalk'
import { generatePhrase, type PhraseContext, type PhraseEvent } from './phrase.ts'
import { stripAnsi, truncateAnsi } from './primitives.ts'
import GLYPHS from './glyphs.json'

chalk.level = 3

// 3-row block letters. Each glyph is exactly 4 cells wide:
//   leading ' ' (letter spacing)
//   3 cells of glyph body using █ (full), ▀ (top half), ▄ (bottom half), ' ' (empty)
// Avoids ░ (light shade) — when single-colored, ░ rendered muddy and obscured the
// letter shape; pure space + half-blocks give clean, readable glyphs.

type Row3 = readonly [string, string, string]

const glyphs: Record<string, Row3> = GLYPHS as unknown as Record<string, Row3>

function renderGlyphRows(text: string, color: ColorName): [string, string, string] {
  const chars = text.toUpperCase().split('')
  const rows: [string, string, string] = ['  ', '  ', '  ']
  for (const ch of chars) {
    const glyph = glyphs[ch] ?? glyphs[' ']!
    rows[0] += glyph[0]
    rows[1] += glyph[1]
    rows[2] += glyph[2]
  }
  const colorize = (chalk[color] ?? chalk.cyan) as (s: string) => string
  return [colorize(rows[0]), colorize(rows[1]), colorize(rows[2])]
}

function renderGlyphs(text: string, color: ColorName): string {
  return renderGlyphRows(text, color).join('\n')
}

function glyphWidth(text: string): number {
  return 2 + text.length * 4
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface HeadingArgs {
  word: string
  color?: ColorName
  event: PhraseEvent
  tone?: PhraseContext['tone']
  width?: number
  // Literal caption to show instead of the generated phrase — skips
  // generatePhrase entirely when set.
  caption?: string
}

export function renderHeading({ word, color = 'cyan', event, tone, width = 60, caption }: HeadingArgs): string {
  const glyphRows = renderGlyphRows(word, color)
  const gutter = 2
  const composed = glyphRows
    .map((g, i) => g + ' '.repeat(gutter)) // + (slots[i] ?? ''))
    .join('\n')
  return '\n' + composed
}

// A checkbox built from the same full/half-block vocabulary as the heading
// alphabet. Thinking of the glyph as a 5x6 bitmap and folding every two pixel
// rows into one terminal row keeps its weight and proportions aligned with the
// large text instead of looking like a thin box-drawing character beside it.
const EMPTY_CHECKBOX_ROWS: Row3 = [' █▀▀▀█', ' █   █', ' █▄▄▄█']
const CHECKED_CHECKBOX_ROWS: Row3 = [' █▀▀▀█', ' █▄ ██', ' █▄█▄█']

export interface CheckboxHeadingArgs {
  caption: string
  checked?: boolean
  color?: ColorName
  description?: string | null
  width?: number
}

function wrapDescription(description: string, width: number): string[] {
  const lines: string[] = []
  for (const sourceLine of description.trim().split(/\r?\n/)) {
    const words = sourceLine.trim().split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (Array.from(next).length <= width || !line) line = next
      else {
        lines.push(line)
        line = word
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

export function renderCheckboxHeading(args: CheckboxHeadingArgs): string
/** @deprecated Pass a CheckboxHeadingArgs object so checked state is explicit. */
export function renderCheckboxHeading(caption: string, color?: ColorName): string
export function renderCheckboxHeading(
  value: CheckboxHeadingArgs | string,
  legacyColor: ColorName = 'green',
): string {
  const args: CheckboxHeadingArgs = typeof value === 'string'
    ? { caption: value, checked: true, color: legacyColor }
    : value
  const color = args.color ?? 'green'
  const colorize = (chalk[color] ?? chalk.green) as (s: string) => string
  const rows = (args.checked ? CHECKED_CHECKBOX_ROWS : EMPTY_CHECKBOX_ROWS).map(r => colorize(r))
  const gutter = 2
  const textIndent = Array.from(EMPTY_CHECKBOX_ROWS[0]).length + gutter
  const descriptionWidth = Math.max(20, (args.width ?? 60) - textIndent)
  const description = args.description?.trim()
    ? wrapDescription(args.description, descriptionWidth)
    : []
  const slots = [
    chalk.bold(colorize(args.caption)),
    description[0] ? chalk.gray(description[0]) : '',
    description[1] ? chalk.gray(description[1]) : '',
  ]
  const composed = rows
    .map((r, i) => r + ' '.repeat(gutter) + slots[i])
  for (const line of description.slice(2)) {
    composed.push(' '.repeat(textIndent) + chalk.gray(line))
  }
  return '\n' + composed.join('\n')
}

// Back-compat shim — emits glyphs only. Used where callers compose phrase
// themselves; new code should prefer renderHeading().
export function renderAnsiShadowText(text: string, color: ColorName = 'cyan'): string {
  return '\n\n' + renderGlyphs(text, color)
}

// Legacy single-line filler. Kept for any caller that still wants a one-shot
// playful line (e.g. log decorations).
export function randomFiller(event: PhraseEvent = 'idle'): string {
  return generatePhrase({ event, word: event, minTokens: 3, maxTokens: 5, width: 40 })
}
