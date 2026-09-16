import { ink } from '../ansi/chalk.ts'
import { detectOutputLanguage, formatJSON, highlight, severity, SEVERITY_INK } from '../ansi/highlight.ts'
import type { Language } from '../ansi/highlight.ts'
import { collapse, firstLine } from '../ansi/text.ts'
import type { Limit } from '../render/fit.ts'
import { META_BADGE, metadataTable, OUTPUT_BADGE, renderCard } from '../tui/index.ts'
import type { BadgeLike, Line } from '../tui/index.ts'
import type { ToolView } from '../types.ts'

// The contract every tool renderer implements, plus the handful of cards they
// all draw. A renderer is a pure function of the tool call and the limit.

export interface Section {
  lines:   readonly Line[];
  badges?: readonly BadgeLike[];
}

export interface ToolRenderer {

  /** Stable name for the showcase and tests. */
  id:     string;
  match:  (toolName: string) => boolean;
  render: (view: ToolView, limit: Limit) => Section;
}

export const named = (...names: readonly string[]) => (toolName: string): boolean => names.includes(toolName)
export const matching = (pattern: RegExp) => (toolName: string): boolean => pattern.test(toolName)

/** Output text in a card, highlighted as `language` (guessed when omitted), collapsed to the limit. */
export function outputCard (text: string, limit: Limit, language: Language | null = null): string {
  const resolved = language ?? detectOutputLanguage(text)
  const body     = resolved === 'json' ? formatJSON(text) : text
  return renderCard({
    badges:  OUTPUT_BADGE,
    content: collapse(body, limit.lines, { paint: head => highlight(head, resolved) }),
  })
}

/** Leftover fields of a result as a key/value table in a card. */
export function metaCard (value: unknown, limit: Limit): string {
  return renderCard({ badges: META_BADGE, content: collapse(metadataTable(value), limit.lines) })
}

/** `✓ Success` / `⨂ failed: …` — one line coloured by what it says. */
export function statusLine (text: string, maxLength = 200): string {
  const line  = firstLine(text.trim(), maxLength)
  const level = severity(line)
  const glyph = level === 'error' ? '⨂ ' : level === 'warning' ? '⚠ ' : '✓ '
  return (level ? SEVERITY_INK[level] : ink.ok)(glyph) + line
}
