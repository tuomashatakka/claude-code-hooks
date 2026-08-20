import type { BadgeColor } from '../types/claude-code.ts'
import {
  getBadgeColor,
  getBadgeTextColor,
  getToolColor,
  getToolIcon,
  parseToolName,
} from './theme.ts'


export interface BadgeProps {
  toolName?: string | null;
  label?:    string | null;
  color?:    BadgeColor | null;
  icon?:     string | null;
}

export type BadgeLike = Badge | string | null | undefined | false

interface ResolvedBadge {
  text:  string;
  color: BadgeColor;
  icon:  string | null;
}

function resolveBadge (props: BadgeProps): ResolvedBadge {
  if (props.toolName)
    return {
      text:  parseToolName(props.toolName).pretty,
      color: props.color ?? getToolColor(props.toolName),
      icon:  props.icon ?? getToolIcon(props.toolName),
    }
  return {
    text:  props.label ?? '',
    color: props.color ?? 'cyan',
    icon:  props.icon ?? null,
  }
}

export function renderBadge (props: BadgeProps = {}): string {
  const { text, color, icon } = resolveBadge(props)
  return getBadgeColor(color).black(` ${icon ? icon + ' ' : ''}${text} `)
}

export class Badge {
  constructor (readonly props: BadgeProps = {}) {}

  toString (): string {
    return renderBadge(this.props)
  }

  renderRule (length: number, character = '▁'): string {
    const { color } = resolveBadge(this.props)
    return getBadgeTextColor(color)(character.repeat(Math.max(0, length)))
  }
}

export function renderBadges (...badges: BadgeLike[]): string {
  return badges
    .filter((badge): badge is Badge | string => Boolean(badge))
    .map(badge => badge instanceof Badge ? badge.toString() : String(badge))
    .join(' ')
}

export const RUNNING_BADGE = new Badge({ label: 'Running', color: 'magenta', icon: '⏎ ' })
export const OUTPUT_BADGE = new Badge({ label: 'Output', color: 'brightGreen', icon: '≘' })
export const META_BADGE = new Badge({ label: 'metadata', color: 'gray', icon: '⛁' })
