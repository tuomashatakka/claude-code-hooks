import chalk from 'chalk'


chalk.level = 3

export type OutputLimitUnit = 'lines' | 'characters'

export interface OutputLimitProps {
  omitted: number;
  unit:    OutputLimitUnit;
}

export function renderOutputLimit ({ omitted, unit }: OutputLimitProps): string {
  const label = omitted === 1 ? unit.slice(0, -1) : unit
  return chalk.gray.italic(`  … ${omitted.toLocaleString('en-US')} ${label} omitted …`)
}
