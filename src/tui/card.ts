import fs from 'node:fs'
import tty from 'node:tty'
import { ansi256, paint256 } from '../ansi/chalk.ts'
import { normalizeCardLine, reseatBackground, trimBlankEdges, truncateAnsi, visibleWidth, wrapAnsi } from '../ansi/text.ts'
import { displayPath } from '../lib/data.ts'
import { badge, badgeRule, isBadge, renderBadges } from './badge.ts'
import type { Badge, BadgeLike } from './badge.ts'
import { TUI_TOKENS } from './tokens.ts'


export interface CardRegion {
  content: string;

  /** Optional heading seated inside this region after its opening blank row. */
  heading?: BadgeLike | readonly BadgeLike[];

  /** Defaults to the regular card background. */
  background?: string;

  /** Close this region with one empty row in its own background. */
  trailingBlank?: boolean;

  /** Keep the content's own background colours — it is a picture, not output. */
  keepBackground?: boolean;
}

export interface BoxProps {
  content:       string | readonly CardRegion[];
  minimumWidth?: number;
  footerText?:   string;
}

export interface CardProps extends BoxProps {
  badges: BadgeLike | readonly BadgeLike[];

  /** Right-aligned in the bottom-right corner: detail about the content, not the title. */
  footer?: BadgeLike | readonly BadgeLike[];
}

const list = <T>(value: T | readonly T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? [ ...value as readonly T[] ] : [ value as T ]

// -------------------------------------------------------------------- width

/**
 * Columns the terminal actually has. A hook's stdio is piped, so the usual
 * `process.stdout.columns` is undefined precisely when it matters; the
 * controlling terminal is still reachable as /dev/tty. Best-effort, cached.
 */
let cachedColumns: number | null = null

function terminalColumns (): number {
  if (cachedColumns !== null)
    return cachedColumns

  const declared = process.stdout.columns || process.stderr.columns || Number(process.env.COLUMNS) || 0
  if (declared > 0)
    return cachedColumns = declared
  try {
    const stream  = new tty.WriteStream(fs.openSync('/dev/tty', 'r+'))
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
  return Math.max(1, Math.min(maximumLayout, (columns > 0 ? columns : fallbackContent) - outerIndentMargin))
}

export const getMaxLayoutWidth = (): number => layoutWidthForTerminal(terminalColumns())

const horizontalPaddingFor = (layoutWidth: number): number =>
  Math.min(TUI_TOKENS.card.horizontalPadding, Math.max(0, Math.floor((layoutWidth - 1) / 2)))

export function getMaxContentWidth (): number {
  const layoutWidth = getMaxLayoutWidth()
  return Math.max(1, layoutWidth - horizontalPaddingFor(layoutWidth) * 2 - TUI_TOKENS.card.chromeColumns)
}

// ---------------------------------------------------------------------- box

/**
 * Boxes are drawn with half-line glyphs rather than `┌─┐`: `▁` rides the bottom
 * of the badge row so the frame closes flush around the fill.
 */
const EDGE_TOP = '▁'

export const renderBoxTopEdge = (width: number): string =>
  paint256.fg(TUI_TOKENS.card.border)(EDGE_TOP.repeat(Math.max(0, width)))

/**
 * The column most lines fit in: a high percentile of the line widths plus a
 * little slack. A handful of long lines then wrap inside the card instead of
 * every other row being padded out to the longest one — which, for source
 * files and JSON, was half of every message. Short outputs have no "typical"
 * line and keep their widest.
 */
const WIDTH_PERCENTILE = 0.9
const WIDTH_SLACK      = 8
const TYPICAL_MINIMUM  = 12

function typicalWidth (widths: readonly number[]): number {
  if (!widths.length)
    return 0

  const sorted = [ ...widths ].sort((a, b) => a - b)
  const widest = sorted.at(-1)!
  if (sorted.length < TYPICAL_MINIMUM)
    return widest

  const typical = sorted[Math.floor((sorted.length - 1) * WIDTH_PERCENTILE)]!
  return Math.min(widest, typical + WIDTH_SLACK)
}

const fitTitle = (title: string, layoutWidth: number): string =>
  visibleWidth(title) > layoutWidth ? truncateAnsi(title, layoutWidth - 1) : title

interface PreparedRegion {
  background:    string;
  heading:       string;
  lines:         string[];
  trailingBlank: boolean;
}

function prepareRegion (region: CardRegion, layoutWidth: number): PreparedRegion {
  const background = region.background ?? TUI_TOKENS.card.background
  const fillParams = `48;5;${ansi256(background)}`
  return {
    background,
    heading: fitTitle(renderBadges(...list(region.heading)), layoutWidth),
    lines:   trimBlankEdges(region.content).split('\n')
      .map(line => reseatBackground(normalizeCardLine(line, region.keepBackground), fillParams)),
    trailingBlank: region.trailingBlank ?? false,
  }
}

interface WrappedRegions {
  regions:      PreparedRegion[];
  contentWidth: number;
}

/** Every region's lines hard-wrapped to the column the card settles on. */
function wrapRegions (regions: readonly PreparedRegion[], maxWidth: number): WrappedRegions {
  const lines        = regions.flatMap(region => region.lines)
  const headings     = regions.map(region => visibleWidth(region.heading))
  const contentWidth = Math.min(maxWidth, Math.max(typicalWidth(lines.map(visibleWidth)), ...headings))
  return {
    contentWidth,
    regions: regions.map(region => ({ ...region, lines: region.lines.flatMap(line => wrapAnsi(line, contentWidth)) })),
  }
}

interface PreparedBox {
  lines: string[];
  width: number;
}

function prepareBox ({ content, minimumWidth = 0, footerText = '' }: BoxProps): PreparedBox {
  const layoutWidth = getMaxLayoutWidth()
  const padding     = horizontalPaddingFor(layoutWidth)
  const prepared    = (typeof content === 'string' ? [{ content }] : content)
    .map(region => prepareRegion(region, layoutWidth))

  const { regions, contentWidth } = wrapRegions(prepared, getMaxContentWidth())
  const width                     = Math.min(layoutWidth, Math.max(contentWidth + padding * 2, minimumWidth))
  const rows: string[]            = []
  let openedByBlank = false

  for (const region of regions) {
    const fill  = paint256.bg(region.background)
    const frame = (line: string, left = padding): string =>
      fill(' '.repeat(left) + line + ' '.repeat(Math.max(0, width - left - visibleWidth(line))))

    // One empty row opens every region unless the previous one already closed with one.
    if (!openedByBlank)
      rows.push(fill(' '.repeat(width)))
    if (region.heading)
      rows.push(frame(region.heading, 0))
    rows.push(...region.lines.map(line => frame(line)))
    if (region.trailingBlank)
      rows.push(fill(' '.repeat(width)))
    openedByBlank = region.trailingBlank
  }

  const lastFill    = paint256.bg(regions.at(-1)?.background ?? TUI_TOKENS.card.background)
  const footerWidth = visibleWidth(footerText)
  rows.push(footerWidth > 0 && footerWidth <= width
    ? lastFill(' '.repeat(width - footerWidth) + footerText)
    : lastFill(' '.repeat(width)))

  return { lines: rows, width }
}

export function renderBox (props: BoxProps): string {
  const box = prepareBox(props)
  return [ '', renderBoxTopEdge(box.width), ...box.lines, '' ].join('\n')
}

export function renderCard ({ badges, content, minimumWidth = 0, footer }: CardProps): string {
  const badgeList           = list(badges)
  const footerText          = renderBadges(...list(footer))
  const title               = fitTitle(renderBadges(...badgeList), getMaxLayoutWidth())
  const { minimumHairline } = TUI_TOKENS.card
  if (!title)
    return renderBox({ content, footerText, minimumWidth: Math.max(minimumWidth, visibleWidth(footerText) + minimumHairline) })

  const badgeWidth = visibleWidth(title)
  const box        = prepareBox({
    content,
    footerText,
    minimumWidth: Math.max(minimumWidth, badgeWidth + minimumHairline, visibleWidth(footerText) + minimumHairline),
  })
  const ruleLength = Math.max(0, box.width - badgeWidth)
  const ruleBadge  = badgeList.find((item): item is Badge => isBadge(item))
  const rule       = ruleBadge
    ? badgeRule(ruleBadge, ruleLength)
    : paint256.fg(TUI_TOKENS.card.ruleFallback)(EDGE_TOP.repeat(ruleLength))
  return [ '', title + rule, ...box.lines, '' ].join('\n')
}

// ------------------------------------------------------------------ path card

export interface PathCardProps {
  path:     string;
  content:  string;
  details?: string | null;
  badges?:  readonly BadgeLike[];

  /** The content is a picture: its background colours are part of it. */
  picture?: boolean;
}

/** A card titled by a file path, with the action and line range in the corner. */
export function renderPathCard ({ path, content, details = null, badges = [], picture = false }: PathCardProps): string {
  return renderCard({
    badges:  [ badge({ label: displayPath(path), color: 'cyan', icon: '▤' }), ...badges ],
    footer:  details ? badge({ label: details, color: 'gray', icon: '⧖' }) : undefined,
    content: [{ content, keepBackground: picture }],
  })
}
