import chalk from 'chalk'


chalk.level = 3

export function renderDuration (durationMs: number | null | undefined): string | null {
  return durationMs == null ? null : chalk.gray(`Δ ${durationMs}ms`)
}

export function pushDurationLine (
  lines: string[],
  durationMs: number | null | undefined,
): void {
  const duration = renderDuration(durationMs)
  if (duration)
    lines.push(duration)
}
