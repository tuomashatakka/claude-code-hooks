import chalk from 'chalk'

// Hooks run with piped stdio, so chalk would otherwise detect "no colour" and
// emit nothing. Forced once, here, instead of at the top of every module.
chalk.level = 3

export { chalk }

const GRAY_SPREAD = 12

/**
 * Nearest xterm-256 index for a hex colour. Near-neutral colours take the
 * 24-step grey ramp, which the 6x6x6 cube cannot stand in for: its darkest
 * grey above black is #5f5f5f, far too light for a card fill.
 */
export function ansi256 (hex: string): number {
  const value       = Number.parseInt(hex.replace('#', ''), 16)
  const [ r, g, b ] = [ value >> 16 & 255, value >> 8 & 255, value & 255 ]
  if (Math.max(r, g, b) - Math.min(r, g, b) < GRAY_SPREAD) {
    const gray = Math.round((r + g + b) / 3)
    if (gray < 8)
      return 16
    if (gray > 238)
      return 231
    return 232 + Math.min(23, Math.round((gray - 8) / 10))
  }

  const cube = (channel: number): number =>
    channel < 48 ? 0 : channel < 115 ? 1 : Math.min(5, Math.round((channel - 35) / 40))
  return 16 + 36 * cube(r) + 6 * cube(g) + cube(b)
}

/**
 * Chrome colours as `ESC[48;5;Nm` (11 chars) rather than truecolor (19). A
 * card pays this on every row, so the shorter form is the one that ships.
 */
export const paint256 = {
  fg: (hex: string) => chalk.ansi256(ansi256(hex)),
  bg: (hex: string) => chalk.bgAnsi256(ansi256(hex)),
}

/** Semantic palette so renderers say what a thing *is*, not which colour it gets. */
export const ink = {
  dim:    chalk.gray,
  note:   chalk.gray.italic,
  ok:     chalk.green,
  warn:   chalk.yellow,
  err:    chalk.red,
  key:    chalk.cyan,
  str:    chalk.green,
  num:    chalk.yellow,
  punct:  chalk.gray,
  accent: chalk.cyan,
  strong: chalk.bold,
} as const
