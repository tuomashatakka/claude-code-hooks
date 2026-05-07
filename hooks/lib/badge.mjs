import { getBadgeColor, getToolColor, getToolIcon, parseToolName } from './theme.mjs';

export function renderBadge({ rawToolName = null, label = null, color = null, icon = null } = {}) {
  let pretty;
  let badgeColor = color;
  let badgeIcon = icon;

  if (rawToolName) {
    pretty = parseToolName(rawToolName).pretty;
    if (!badgeIcon) badgeIcon = getToolIcon(rawToolName);
    if (!badgeColor) badgeColor = getToolColor(rawToolName);
  } else {
    pretty = label || '';
    if (!badgeColor) badgeColor = 'cyan';
  }

  const bg = getBadgeColor(badgeColor);
  return bg.black(` ${badgeIcon ? badgeIcon + ' ' : ''}${pretty} `);
}

export class Badge {
  icon = null;
  color = null;
  label = null;
  toolName = null;

  constructor(props = {}) {
    if (props.icon) this.icon = props.icon;
    if (props.color) this.color = props.color;
    if (props.label) this.label = props.label;
    if (props.toolName) this.toolName = props.toolName;
  }

  get rawToolName() { return this.toolName; }

  toString() {
    return renderBadge({
      rawToolName: this.rawToolName,
      label: this.label,
      color: this.color,
      icon: this.icon,
    });
  }
}

export function renderBadges(...badges) {
  return badges
    .filter(Boolean)
    .map(b => (b instanceof Badge ? b.toString() : String(b)))
    .join(' ');
}
