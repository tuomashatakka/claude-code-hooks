import type { BadgeColor } from '../types.ts'
import { bg, fg, parseToolName, toolTheme } from './theme.ts'


export interface Badge {
  readonly kind:  'badge';
  readonly label: string;
  readonly color: BadgeColor;
  readonly icon:  string | null;
}

export interface BadgeProps {
  label?: string | null;
  color?: BadgeColor | null;
  icon?:  string | null;
}

/** Anything a badge slot accepts; falsy values are simply skipped. */
export type BadgeLike = Badge | string | null | undefined | false

export function badge ({ label, color, icon }: BadgeProps): Badge {
  return { kind: 'badge', label: label ?? '', color: color ?? 'cyan', icon: icon ?? null }
}

/** A badge named and coloured after a tool, overridable field by field. */
export function toolBadge (toolName: string, overrides: BadgeProps = {}): Badge {
  const theme = toolTheme(toolName)
  return badge({
    label: overrides.label ?? parseToolName(toolName).pretty,
    color: overrides.color ?? theme.color,
    icon:  overrides.icon === undefined ? theme.icon : overrides.icon,
  })
}

export function isBadge (value: unknown): value is Badge {
  return typeof value === 'object' && value !== null && (value as Badge).kind === 'badge'
}

export function renderBadge ({ label, color, icon }: Badge): string {
  return bg(color).black(` ${icon ? icon + ' ' : ''}${label} `)
}

/** The rule that continues a badge's colour along a card's top edge. */
export function badgeRule ({ color }: Badge, length: number, character = '▁'): string {
  return fg(color)(character.repeat(Math.max(0, length)))
}

export function renderBadges (...badges: readonly BadgeLike[]): string {
  return badges
    .filter((item): item is Badge | string => Boolean(item))
    .map(item => isBadge(item) ? renderBadge(item) : String(item))
    .join(' ')
}

export const RUNNING_BADGE = badge({ label: 'Running', color: 'magenta', icon: '⏎ ' })
export const OUTPUT_BADGE  = badge({ label: 'Output', color: 'brightGreen', icon: '≘' })
export const META_BADGE    = badge({ label: 'metadata', color: 'gray', icon: '⛁' })
