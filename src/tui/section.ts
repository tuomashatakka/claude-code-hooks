import { ink } from '../ansi/chalk.ts'
import { stripAnsi, wrapText } from '../ansi/text.ts'
import { renderBadges } from './badge.ts'
import type { BadgeLike } from './badge.ts'
import { getMaxContentWidth } from './card.ts'
import { TUI_TOKENS } from './tokens.ts'


export type Line = string | false | null | undefined

/** A badge row, then the body lines that survive, separated by one blank line. */
export function section (badges: BadgeLike | readonly BadgeLike[], lines: readonly Line[] = []): string {
  const body = lines.filter((line): line is string => Boolean(line))
  return renderBadges(...Array.isArray(badges) ? badges as readonly BadgeLike[] : [ badges as BadgeLike ]) +
    (body.length ? '\n\n' + body.join('\n') : '')
}

/**
 * Cards stacked one per row. Terminal history is a timeline; keeping every
 * card on its own row keeps that order stable at every viewport width.
 */
export function stack (items: readonly Line[]): string {
  return items
    .filter((item): item is string => Boolean(item))
    .map(item => item.replace(/^\n+|\n+$/g, ''))
    .join('\n\n')
}

export const durationLine = (durationMs: number | null | undefined): string | null =>
  durationMs == null ? null : ink.dim(`Δ ${durationMs}ms`)

/** Quoted prose — a prompt, a summary — capped and wrapped to the content width. */
export function prose (text: string, limit = Infinity, indent = 0): string {
  const capped = text.length > limit ? text.slice(0, limit) + '...' : text
  return wrapText(capped, getMaxContentWidth() - indent)
}

/** A glyph-led status line: `✓ done`, `⨂ failed`. */
export const statusLine = (glyph: string, text: string): string => glyph + ' ' + text

// -------------------------------------------------------------------- rulers

const RULER_RE = /^(-{3,}|={3,}|─{3,}|═{3,})(.*)$/

/** A `=== title ===` line as a centred divider, or null when the line is not one. */
export function renderRuler (line: string): string | null {
  const match = RULER_RE.exec(stripAnsi(line).trim())
  if (!match)
    return null

  const character = '=═'.includes(match[1]![0]!) ? '═' : '─'
  const text      = match[2]!.replace(/[-=─═]{3,}\s*$/, '').trim()
  if (!text)
    return ink.dim(character.repeat(TUI_TOKENS.width.divider))

  const label     = ` ${text} `
  const remaining = Math.max(6, TUI_TOKENS.width.divider - label.length)
  const left      = Math.floor(remaining / 2)
  return ink.dim(character.repeat(left)) + ink.strong(label) + ink.dim(character.repeat(remaining - left))
}

export interface RulerSection {
  content:         string;
  beginsWithRuler: boolean;
}

/** Splits text so every ruler opens a new section. */
export function splitRulerSections (text: string): RulerSection[] {
  const sections: RulerSection[] = []
  for (const line of String(text).split('\n')) {
    const isRuler = renderRuler(line) !== null
    const current = sections.at(-1)
    if (isRuler || !current)
      sections.push({ content: line, beginsWithRuler: isRuler })
    else
      current.content += '\n' + line
  }
  return sections
}
