import chalk from 'chalk';
import fs from 'node:fs';
import tty from 'node:tty';
import { truncateAnsi, visibleWidth } from '../render/primitives.ts';
import { Badge, renderBadges, type BadgeLike } from './badge.ts';
import { TUI_TOKENS } from './tokens.ts';

chalk.level = 3;

interface PreparedBox {
  lines: string[];
  /** Outer width including the side glyphs, excluding the shadow column. */
  width: number;
}

export interface BoxProps {
  content: string;
  minimumWidth?: number;
  /** Pre-rendered badges to seat in the bottom edge, flush right. */
  footerText?: string;
  /**
   * Hang a `░` drop shadow off the right and bottom edges. Off by default:
   * every glyph costs bytes against the transport's ~10KB systemMessage cap,
   * so it is reserved for the one card that benefits — the file preview.
   */
  shadow?: boolean;
}

export interface CardProps extends BoxProps {
  badges: BadgeLike | readonly BadgeLike[];
  /**
   * Right-aligned on the box's bottom edge. For detail about the content —
   * the action, the line range — as opposed to the title badges, which say
   * what the box *is*. Keeping the two apart stops a long path and its
   * modifiers from competing for the same corner.
   */
  footer?: BadgeLike | readonly BadgeLike[];
}

/**
 * Columns the terminal actually has, cached for the life of the process.
 *
 * A hook's stdout is a pipe — Claude Code reads the response JSON off it — so
 * `process.stdout.columns` is undefined in precisely the situation that matters,
 * and stderr is captured the same way. The fallback that used to stand in for it
 * sized every card and every picture to 96 columns however wide the window was.
 *
 * The controlling terminal is still reachable under its own name, so ask it
 * directly. Everything here is best-effort: a hook running detached, in CI or
 * under a test runner has no `/dev/tty` to open, and falls back rather than
 * failing.
 */
let cachedColumns: number | null = null;

function terminalColumns(): number {
  if (cachedColumns !== null) return cachedColumns;

  const declared = process.stdout.columns || process.stderr.columns || Number(process.env.COLUMNS) || 0;
  if (declared > 0) return (cachedColumns = declared);

  try {
    const fd = fs.openSync('/dev/tty', 'r+');
    const stream = new tty.WriteStream(fd);
    const columns = stream.columns || 0;
    stream.destroy();
    return (cachedColumns = columns);
  } catch {
    return (cachedColumns = 0);
  }
}

export function getMaxLayoutWidth(): number {
  const columns = terminalColumns();
  const { fallbackContent, outerIndentMargin } = TUI_TOKENS.width;
  return Math.max(20, (columns > 0 ? columns : fallbackContent) - outerIndentMargin);
}

export function getMaxContentWidth(): number {
  const { horizontalPadding, chromeColumns } = TUI_TOKENS.card;
  return Math.max(20, getMaxLayoutWidth() - horizontalPadding * 2 - chromeColumns);
}

/**
 * Boxes are drawn with half-line glyphs rather than `┌─┐`, because each one sits
 * against a different side of its own cell: `▁` rides the bottom of the badge
 * row, `▔` the top of the row under the box, and `▏`/`▕` hug the inner edges of
 * the side columns. The frame closes up flush around the fill instead of
 * floating a rule a whole cell away from it.
 */
const EDGE_LEFT = '▏';
const EDGE_RIGHT = '▕';
const EDGE_BOTTOM = '▔';
const EDGE_TOP = '▁';
const SHADOW = '░';

function borderInk(text: string): string {
  return chalk.hex(TUI_TOKENS.card.border)(text);
}

function shadowInk(text: string): string {
  return chalk.hex(TUI_TOKENS.card.shadow)(text);
}

/** The `▁` run a bare box uses where a card would put its badge. */
export function renderBoxTopEdge(width: number): string {
  return borderInk(EDGE_TOP.repeat(Math.max(0, width)));
}

function prepareBox({ content, minimumWidth = 0, shadow = false, footerText = '' }: BoxProps): PreparedBox {
  const maxWidth = getMaxContentWidth();
  const { background, horizontalPadding } = TUI_TOKENS.card;
  const lines = String(content)
    .replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, '')
    .split('\n')
    .map(line => visibleWidth(line) > maxWidth ? truncateAnsi(line, maxWidth - 1) : line);
  const contentWidth = Math.min(Math.max(...lines.map(visibleWidth), 0), maxWidth);
  // minimumWidth is stated in outer columns — it exists so a badge's rule keeps
  // a hairline — so the side glyphs come off it before the fill is sized.
  const innerWidth = Math.max(contentWidth + horizontalPadding * 2, minimumWidth - 2);
  const width = innerWidth + 2;

  const fill = chalk.bgHex(background);
  const left = borderInk(EDGE_LEFT);
  const right = borderInk(EDGE_RIGHT);
  const shade = shadow ? shadowInk(SHADOW) : '';
  const frame = (row: string) => left + fill(row) + right + shade;

  const padding = frame(' '.repeat(innerWidth));
  const body = lines.map(line =>
    frame(
      ' '.repeat(horizontalPadding)
      + line
      + ' '.repeat(Math.max(0, innerWidth - horizontalPadding - visibleWidth(line)))
    )
  );
  // The footer sits *in* the bottom edge, flush right, so the rule runs into it
  // and the badge closes the corner off.
  const footerWidth = visibleWidth(footerText);
  const bottom = footerWidth > 0 && footerWidth < width
    ? borderInk(EDGE_BOTTOM.repeat(width - footerWidth)) + footerText + shade
    : borderInk(EDGE_BOTTOM.repeat(width)) + shade;
  // Offset one column right so the cast reads as a shadow, not another border.
  const cast = shadow ? ' ' + shadowInk(SHADOW.repeat(width)) : null;

  return {
    lines: [padding, ...body, padding, bottom, ...(cast ? [cast] : [])],
    width,
  };
}

export function renderBox(props: BoxProps): string {
  const box = prepareBox(props);
  return ['', renderBoxTopEdge(box.width), ...box.lines, ''].join('\n');
}

export function renderCard({ badges, content, minimumWidth = 0, shadow = false, footer }: CardProps): string {
  const badgeList = Array.isArray(badges) ? badges : [badges];
  const footerList = footer === undefined ? [] : (Array.isArray(footer) ? footer : [footer]);
  const footerText = renderBadges(...footerList);
  const title = renderBadges(...badgeList);
  if (!title) return renderBox({ content, minimumWidth, shadow, footerText });

  const badgeWidth = visibleWidth(title);
  const { minimumHairline } = TUI_TOKENS.card;
  const box = prepareBox({
    content,
    shadow,
    footerText,
    minimumWidth: Math.max(
      minimumWidth,
      badgeWidth + minimumHairline,
      visibleWidth(footerText) + minimumHairline,
    ),
  });
  const ruleLength = Math.max(0, box.width - badgeWidth);
  const ruleBadge = badgeList.find((badge): badge is Badge => badge instanceof Badge);
  const rule = ruleBadge
    ? ruleBadge.renderRule(ruleLength)
    : chalk.hex(TUI_TOKENS.card.ruleFallback)('▁'.repeat(ruleLength));
  return ['', title + rule, ...box.lines, ''].join('\n');
}
