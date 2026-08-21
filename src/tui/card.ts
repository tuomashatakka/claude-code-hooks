import chalk from 'chalk'
import fs from 'node:fs'
import tty from 'node:tty'
import { normalizeCardLine, truncateAnsi, visibleWidth, wrapAnsi } from '../render/primitives.ts'
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

  /** Close this region with one empty row in its own background. */
  trailingBlank?: boolean;
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

export function layoutWidthForTerminal (columns: number): number {
  const { fallbackContent, maximumLayout, outerIndentMargin } = TUI_TOKENS.width
  const available                                             = (columns > 0 ? columns : fallbackContent) - outerIndentMargin
  return Math.max(1, Math.min(maximumLayout, available))
}

export function getMaxLayoutWidth (): number {
  return layoutWidthForTerminal(terminalColumns())
}

export function getMaxContentWidth (): number {
  const layoutWidth = getMaxLayoutWidth()
  const padding     = horizontalPaddingFor(layoutWidth)
  return Math.max(1, layoutWidth - padding * 2 - TUI_TOKENS.card.chromeColumns)
}

function horizontalPaddingFor (layoutWidth: number): number {
  return Math.min(TUI_TOKENS.card.horizontalPadding, Math.max(0, Math.floor((layoutWidth - 1) / 2)))
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
  const layoutWidth       = getMaxLayoutWidth()
  const maxWidth          = getMaxContentWidth()
  const { background }    = TUI_TOKENS.card
  const horizontalPadding = horizontalPaddingFor(layoutWidth)
  const regions           = regionList(content).map(region => {
    const headingList = region.heading === undefined
      ? []
      : Array.isArray(region.heading) ? region.heading : [ region.heading ]
    const fullHeading = renderBadges(...headingList)
    const heading     = visibleWidth(fullHeading) > layoutWidth
      ? truncateAnsi(fullHeading, layoutWidth - 1)
      : fullHeading
    const lines   = String(region.content)
      .replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, '')
      .split('\n')
      .map(normalizeCardLine)
      .flatMap(line => wrapAnsi(line, maxWidth))
    return {
      background:    region.background ?? background,
      heading,
      lines,
      trailingBlank: region.trailingBlank ?? false,
    }
  })

  const contentWidth = Math.min(Math.max(
    ...regions.flatMap(region => [ visibleWidth(region.heading), ...region.lines.map(visibleWidth) ]),
    0,
  ), maxWidth)
  const width          = Math.min(layoutWidth, Math.max(contentWidth + horizontalPadding * 2, minimumWidth))
  const footerWidth    = visibleWidth(footerText)
  const rows: string[] = []
  let transitionBlank  = false

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
    if (!transitionBlank)
      rows.push(fill(' '.repeat(width)))
    if (region.heading)
      rows.push(frame(region.heading, 0))
    rows.push(...region.lines.map(line => frame(line)))
    if (region.trailingBlank)
      rows.push(fill(' '.repeat(width)))
    transitionBlank = region.trailingBlank
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
  const fullTitle  = renderBadges(...badgeList)
  const title      = visibleWidth(fullTitle) > getMaxLayoutWidth()
    ? truncateAnsi(fullTitle, getMaxLayoutWidth() - 1)
    : fullTitle
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
