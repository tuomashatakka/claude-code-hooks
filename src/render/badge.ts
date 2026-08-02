import type { BadgeColor } from '../types/claude-code.ts';
import { getBadgeColor, getToolColor, getToolIcon, parseToolName } from './theme.ts';

export interface BadgeProps {
  toolName?: string | null;
  label?: string | null;
  color?: BadgeColor | null;
  icon?: string | null;
}

export function renderBadge(props: BadgeProps = {}): string {
  const { toolName = null, label = null } = props;
  let pretty: string;
  let badgeColor: BadgeColor | null = props.color ?? null;
  let badgeIcon: string | null = props.icon ?? null;

  if (toolName) {
    pretty = parseToolName(toolName).pretty;
    if (!badgeIcon) badgeIcon = getToolIcon(toolName);
    if (!badgeColor) badgeColor = getToolColor(toolName);
  } else {
    pretty = label ?? '';
    if (!badgeColor) badgeColor = 'cyan';
  }

  const bg = getBadgeColor(badgeColor!);
  return bg.black(` ${badgeIcon ? badgeIcon + ' ' : ''}${pretty} `);
}

export class Badge {
  readonly icon: string | null;
  readonly color: BadgeColor | null;
  readonly label: string | null;
  readonly toolName: string | null;

  constructor(props: BadgeProps = {}) {
    this.icon = props.icon ?? null;
    this.color = props.color ?? null;
    this.label = props.label ?? null;
    this.toolName = props.toolName ?? null;
  }

  toString(): string {
    return renderBadge({
      toolName: this.toolName,
      label: this.label,
      color: this.color,
      icon: this.icon,
    });
  }
}

export function renderBadges(...badges: Array<Badge | string | null | undefined | false>): string {
  return badges
    .filter((b): b is Badge | string => Boolean(b))
    .map(b => (b instanceof Badge ? b.toString() : String(b)))
    .join(' ');
}

/**
 * Badges that label a card's contents.
 *
 * A section badge names the tool; these name what the card below them holds,
 * so a call that shows input, output and metadata reads as three labelled
 * blocks rather than one run-on wall.
 */
export const RUNNING_BADGE = new Badge({ label: 'Running', color: 'magenta', icon: '⏎ ' }).toString();
export const OUTPUT_BADGE  = new Badge({ label: 'Output', color: 'brightGreen', icon: '≘' }).toString();
export const META_BADGE    = new Badge({ label: 'metadata', color: 'gray', icon: '⛁' }).toString();
