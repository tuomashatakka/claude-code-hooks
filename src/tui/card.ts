import chalk from 'chalk';
import { truncateAnsi, visibleWidth } from '../render/primitives.ts';
import { Badge, renderBadges, type BadgeLike } from './badge.ts';
import { TUI_TOKENS } from './tokens.ts';

chalk.level = 3;

interface PreparedBox {
  lines: string[];
  width: number;
}

export interface BoxProps {
  content: string;
  minimumWidth?: number;
}

export interface CardProps extends BoxProps {
  badges: BadgeLike | readonly BadgeLike[];
}

export function getMaxLayoutWidth(): number {
  const columns = process.stdout.columns || Number(process.env.COLUMNS) || 0;
  const { fallbackContent, outerIndentMargin } = TUI_TOKENS.width;
  return Math.max(20, (columns > 0 ? columns : fallbackContent) - outerIndentMargin);
}

export function getMaxContentWidth(): number {
  return Math.max(20, getMaxLayoutWidth() - TUI_TOKENS.card.horizontalPadding * 2);
}

function prepareBox({ content, minimumWidth = 0 }: BoxProps): PreparedBox {
  const maxWidth = getMaxContentWidth();
  const { background, horizontalPadding } = TUI_TOKENS.card;
  const lines = String(content)
    .replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, '')
    .split('\n')
    .map(line => visibleWidth(line) > maxWidth ? truncateAnsi(line, maxWidth - 1) : line);
  const contentWidth = Math.min(Math.max(...lines.map(visibleWidth), 0), maxWidth);
  const width = Math.max(contentWidth + horizontalPadding * 2, minimumWidth);
  const fill = chalk.bgHex(background);
  const padding = fill(' '.repeat(width));
  const body = lines.map(line =>
    fill(
      ' '.repeat(horizontalPadding)
      + line
      + ' '.repeat(Math.max(0, width - horizontalPadding - visibleWidth(line)))
    )
  );
  return { lines: [padding, ...body, padding], width };
}

export function renderBox(props: BoxProps): string {
  const box = prepareBox(props);
  return ['', ...box.lines, ''].join('\n');
}

export function renderCard({ badges, content, minimumWidth = 0 }: CardProps): string {
  const badgeList = Array.isArray(badges) ? badges : [badges];
  const title = renderBadges(...badgeList);
  if (!title) return renderBox({ content, minimumWidth });

  const badgeWidth = visibleWidth(title);
  const box = prepareBox({
    content,
    minimumWidth: Math.max(minimumWidth, badgeWidth + TUI_TOKENS.card.minimumHairline),
  });
  const ruleLength = Math.max(0, box.width - badgeWidth);
  const ruleBadge = badgeList.find((badge): badge is Badge => badge instanceof Badge);
  const rule = ruleBadge
    ? ruleBadge.renderRule(ruleLength)
    : chalk.hex(TUI_TOKENS.card.ruleFallback)('▁'.repeat(ruleLength));
  return ['', title + rule, ...box.lines, ''].join('\n');
}
