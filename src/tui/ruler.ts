import chalk from 'chalk'
import { stripAnsi } from '../render/primitives.ts'
import { TUI_TOKENS } from './tokens.ts'


chalk.level = 3

export function renderRuler (line: string): string | null {
  const plain = stripAnsi(line).trim()
  const match = plain.match(/^(-{3,}|={3,}|─{3,}|═{3,})(.*)$/)
  if (!match)
    return null

  const character = match[1]![0] === '=' || match[1]![0] === '═' ? '═' : '─'
  const text      = match[2]!.replace(/[-=─═]{3,}\s*$/, '').trim()
  if (!text)
    return chalk.gray(character.repeat(TUI_TOKENS.width.divider))

  const label     = ` ${text} `
  const remaining = Math.max(6, TUI_TOKENS.width.divider - label.length)
  const left      = Math.floor(remaining / 2)
  return chalk.gray(character.repeat(left)) +
    chalk.bold(label) +
    chalk.gray(character.repeat(remaining - left))
}

export interface RulerSection {
  content:         string;
  beginsWithRuler: boolean;
}

/** Splits stdout so every ruler becomes the first content row of a new card. */
export function splitRulerSections (text: string): RulerSection[] {
  const sections: RulerSection[] = []
  let lines: string[] = []
  let beginsWithRuler = false

  const flush = () => {
    if (!lines.length)
      return
    sections.push({ content: lines.join('\n'), beginsWithRuler })
    lines = []
  }

  for (const line of String(text).split('\n')) {
    if (renderRuler(line) !== null) {
      flush()
      beginsWithRuler = true
    }
    else if (!lines.length)
      beginsWithRuler = false
    lines.push(line)
  }
  flush()
  return sections
}
