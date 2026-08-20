import chalk from 'chalk'
import fs from 'node:fs'
import tty from 'node:tty'
import { normalizeCardLine, truncateAnsi, visibleWidth } from '../render/primitives.ts'
import { Badge, renderBadges } from './badge.ts'
import type { BadgeLike } from './badge.ts'
import { TUI_TOKENS } from './tokens.ts'


chalk.level = 3

interface PreparedBox {
  lines: string[];

  /** Width shared by the title rule and every backgrounded body row. */
  width: number;
}

export interface CardRegion {
  content: string;

  /** Optional heading seated inside this region after its opening blank row. */
  heading?: BadgeLike | readonly BadgeLike[];

  /** Defaults to the regular card background. */
  background?: string;
}

export interface BoxProps {
  content:       string | readonly CardRegion[];
  minimumWidth?: number;

  /** Pre-rendered badges to seat inside the bottom-right corner. */
  footerText?: string;
}

export interface CardProps extends BoxProps {
  badges: BadgeLike | readonly BadgeLike[];

  /**
   * Right-aligned inside the box's bottom-right corner. For detail about the content —
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
let cachedColumns: number | null = null

function terminalColumns (): number {
  if (cachedColumns !== null)
    return cachedColumns

  const declared = process.stdout.columns || process.stderr.columns || Number(process.env.COLUMNS) || 0
  if (declared > 0)
    return cachedColumns = declared

  try {
    const fd      = fs.openSync('/dev/tty', 'r+')
    const stream  = new tty.WriteStream(fd)
    const columns = stream.columns || 0
    stream.destroy()
    return cachedColumns = columns
  }
  catch {
    return cachedColumns = 0
  }
}

export function getMaxLayoutWidth (): number {
  const columns                                = terminalColumns()
  const { fallbackContent, outerIndentMargin } = TUI_TOKENS.width
  return Math.max(20, (columns > 0 ? columns : fallbackContent) - outerIndentMargin)
}

export function getMaxContentWidth (): number {
  const { horizontalPadding, chromeColumns } = TUI_TOKENS.card
  return Math.max(20, getMaxLayoutWidth() - horizontalPadding * 2 - chromeColumns)
}

/**
 * Boxes are drawn with half-line glyphs rather than `┌─┐`, because each one sits
 * against a different side of its own cell: `▁` rides the bottom of the badge
 * row, `▔` the top of the row under the box, and `▏`/`▕` hug the inner edges of
 * the side columns. The frame closes up flush around the fill instead of
 * floating a rule a whole cell away from it.
 */
const EDGE_TOP = '▁'

function borderInk (text: string): string {
  return chalk.hex(TUI_TOKENS.card.border)(text)
}

/** The `▁` run a bare box uses where a card would put its badge. */
export function renderBoxTopEdge (width: number): string {
  return borderInk(EDGE_TOP.repeat(Math.max(0, width)))
}

function regionList (content: BoxProps['content']): CardRegion[] {
  return typeof content === 'string' ? [{ content }] : [ ...content ]
}

function prepareBox ({ content, minimumWidth = 0, footerText = '' }: BoxProps): PreparedBox {
  const maxWidth                          = getMaxContentWidth()
  const { background, horizontalPadding } = TUI_TOKENS.card
  const regions                           = regionList(content).map(region => {
    const headingList = region.heading === undefined
      ? []
      : Array.isArray(region.heading) ? region.heading : [ region.heading ]
    const heading = renderBadges(...headingList)
    const lines   = String(region.content)
      .replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, '')
      .split('\n')
      .map(normalizeCardLine)
      .map(line => visibleWidth(line) > maxWidth ? truncateAnsi(line, maxWidth - 1) : line)
    return { background: region.background ?? background, heading, lines }
  })

  const contentWidth = Math.min(Math.max(
    ...regions.flatMap(region => [ visibleWidth(region.heading), ...region.lines.map(visibleWidth) ]),
    0,
  ), maxWidth)
  const width          = Math.max(contentWidth + horizontalPadding * 2, minimumWidth)
  const footerWidth    = visibleWidth(footerText)
  const rows: string[] = []

  for (const region of regions) {
    const fill  = chalk.bgHex(region.background)
    const frame = (line: string, leftPadding: number = horizontalPadding) => fill(
      ' '.repeat(leftPadding) +
      line +
      ' '.repeat(Math.max(0, width - leftPadding - visibleWidth(line)))
    )

    // One deliberate empty row opens every region. For ruler-led regions this
    // is the requested single beat before the heading; for a normal card it is
    // the top breathing room the old full frame used to provide.
    rows.push(fill(' '.repeat(width)))
    if (region.heading)
      rows.push(frame(region.heading, 0))
    rows.push(...region.lines.map(line => frame(line)))
  }

  const lastBackground = regions.at(-1)?.background ?? background
  const fillLast       = chalk.bgHex(lastBackground)
  if (footerWidth > 0 && footerWidth <= width)
    rows.push(fillLast(' '.repeat(width - footerWidth) + footerText)); else
    rows.push(fillLast(' '.repeat(width)))

  return {
    lines: rows,
    width,
  }
}

export function renderBox (props: BoxProps): string {
  const box = prepareBox(props)
  return [ '', renderBoxTopEdge(box.width), ...box.lines, '' ].join('\n')
}

export function renderCard ({ badges, content, minimumWidth = 0, footer }: CardProps): string {
  const badgeList  = Array.isArray(badges) ? badges : [ badges ]
  const footerList = footer === undefined ? [] : Array.isArray(footer) ? footer : [ footer ]
  const footerText = renderBadges(...footerList)
  const title      = renderBadges(...badgeList)
  if (!title)
    return renderBox({
      content,
      footerText,
      minimumWidth: Math.max(minimumWidth, visibleWidth(footerText) + TUI_TOKENS.card.minimumHairline),
    })

  const badgeWidth          = visibleWidth(title)
  const { minimumHairline } = TUI_TOKENS.card
  const box                 = prepareBox({
    content,
    footerText,
    minimumWidth: Math.max(
      minimumWidth,
      badgeWidth + minimumHairline,
      visibleWidth(footerText) + minimumHairline,
    ),
  })
  const ruleLength = Math.max(0, box.width - badgeWidth)
  const ruleBadge  = badgeList.find((badge): badge is Badge => badge instanceof Badge)
  const rule       = ruleBadge
    ? ruleBadge.renderRule(ruleLength)
    : chalk.hex(TUI_TOKENS.card.ruleFallback)('▁'.repeat(ruleLength))
  return [ '', title + rule, ...box.lines, '' ].join('\n')
}
