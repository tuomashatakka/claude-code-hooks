import chalk from 'chalk'
import fs from 'node:fs'
import { imageToAscii } from '@tuomashatakka/image-to-ascii'
import type { BudgetSpec } from '@tuomashatakka/image-to-ascii'
import { formatJSON, isJSON, simpleHighlight, langFromPath, detectContentLanguage } from './highlight.ts'
import { softCollapse } from './primitives.ts'
import type { SoftCollapseOptions } from './primitives.ts'
import { getMaxContentWidth, renderFileCard } from '../tui/index.ts'
import { HOOK_RESPONSE_CHAR_BUDGET } from '../runtime/output-transport.ts'


const IMAGE_EXTENSIONS = new Set([ 'png', 'jpg', 'jpeg', 'webp' ])

export type FilePreviewKind = 'image' | 'text'

export interface FilePreview {
  content: string;
  kind:    FilePreviewKind;
}

export interface FilePreviewOptions {
  fallbackText?: string | null;
  readText?:     boolean;
  maxWidth?:     number;

  /** Characters the finished *card* may cost. Images are sized to it. */
  budgetChars?: number;

  /** Reshape the raw text before highlighting — e.g. drop a bulky trailer. */
  transform?: ((raw: string) => string) | null;
}

export function extensionFromPath (filePath: string | null | undefined): string {
  const match = String(filePath ?? '').match(/\.([^./\\\s]+)$/)
  return match ? `.${match[1]!.toLowerCase()}` : ''
}

export function isImageExtension (ext: string | null | undefined): boolean {
  return IMAGE_EXTENSIONS.has(String(ext ?? '').toLowerCase()
    .replace(/^\./, ''))
}

export function isImagePath (filePath: string | null | undefined): boolean {
  return isImageExtension(extensionFromPath(filePath))
}

export function renderTextPreview (content: string, filePath?: string | null): string {
  const lang = langFromPath(filePath) ?? detectContentLanguage(content)
  if (isJSON(content))
    return simpleHighlight(formatJSON(content), 'json')
  return lang ? simpleHighlight(content, lang) : content
}

export function renderFilePreview (filePath: string, options: FilePreviewOptions = {}): FilePreview | null {
  const ext      = extensionFromPath(filePath)
  const maxWidth = options.maxWidth ?? getMaxContentWidth()

  if (isImageExtension(ext))
    try {
      const ascii = imageToAscii(fs.readFileSync(filePath), ext, {
        maxWidth,
        budget: imageBudget(options.budgetChars ?? previewBudgetChars()),
      })
      if (ascii)
        return { content: ascii, kind: 'image' }
    }
    catch {}

  const shape = (raw: string) => renderTextPreview(options.transform ? options.transform(raw) : raw, filePath)

  if (options.readText !== false)
    try {
      return { content: shape(fs.readFileSync(filePath, 'utf8')), kind: 'text' }
    }
    catch {}

  return options.fallbackText == null
    ? null
    : { content: shape(options.fallbackText), kind: 'text' }
}

// ------------------------------------------------------------------ budget --
//
// What a preview may cost, and how that cost is decided: not modelled, but
// measured. Predicting the size of a rendered card means predicting how chalk
// rewrites nested styles inside a background fill, and every estimate of that
// came out low by a factor of three.
//
// Being wrong is expensive. The transport's answer to an oversized message is
// to cut its middle out, so a mis-sized picture arrives with a hole in it. So
// the card is rendered, weighed on the scale that actually decides — the
// character count Claude Code itself applies the 10,000 limit to — and rendered
// again smaller until it fits.
//

/** Badges, duration line and the rest of the response around the card. */
const SECTION_RESERVE = 700

/** Characters one card may spend, unless the caller is drawing several. */
export function previewBudgetChars (): number {
  return Math.max(1_200, HOOK_RESPONSE_CHAR_BUDGET - SECTION_RESERVE)
}

function charCost (text: string): number {
  return text.length
}

/**
 * What the picture inside a card is really charged, so the renderer can size
 * itself once instead of being re-measured into place.
 *
 * Only the card is charged for here, and that is the whole correction: the
 * limit is applied to the parsed string, so neither JSON's six bytes per ESC
 * nor UTF-8's three-to-four per glyph is a cost anybody pays. What is left is
 * the wrapper — the card pads every row out to its own width in a background
 * fill and closes it with an SGR pair — and the two constants below are
 * measured off rendered cards rather than derived, because deriving them means
 * predicting how chalk rewrites nested styles inside a fill.
 */
const CARD_CHROME  = 280 // title badge, top rule and optional footer
const CARD_PER_ROW = 105 // background fill, its SGR pair, the newline

function imageBudget (cardChars: number): BudgetSpec {
  return {
    total:    Math.max(600, cardChars),
    overhead: CARD_CHROME,
    perRow:   CARD_PER_ROW,
  }
}

/**
 * Shares of the card budget to re-render a picture against, should the measured
 * card still land over it. Modelling the wrapper gets close, not exact, so the
 * ladder buys the slack back — and it is a *budget* ladder rather than the width
 * ladder it replaces, because width is not the axis that shrinks a tall image:
 * a 40x4000 source renders two columns wide however much room it is given.
 */
const BUDGET_LADDER = [ 0.75, 0.5, 0.3, 0.15 ]

/**
 * Re-aims a picture that fitted with room to spare, and it is the other half of
 * the same idea as the ladder above.
 *
 * The wrapper model is deliberately pessimistic, and the renderer can only
 * choose whole cells — widening by one column costs a proportional band of rows
 * — so the largest size that clears the modelled budget routinely clears the
 * real one by a quarter. Tuning the constants down to close that gap trades a
 * reliable underestimate for an occasional overrun, which is the expensive
 * direction. Measuring the overshoot and aiming again spends the slack without
 * giving up the guarantee: every candidate is still weighed before it ships.
 */
const GROWTH_ATTEMPTS = 3

/** Slack worth another render, as a share of the budget. */
const GROWTH_THRESHOLD = 0.94

/** Stands in for a picture that no budget could fit. */
const NO_ROOM = chalk.gray.italic('… image preview omitted — no room left in this message …')

// wcgw addresses files as `/path/to/file.ts:10-40`. Split the range off so the
// path still resolves on disk, and keep it around to show alongside the box.
const LINE_RANGE_RE = /:(\d+)(?:-(\d+)?)?$/

export interface LineRange { start: number; end: number | null }

type StripLineRangeReturnType = { path: string; range: LineRange | null }

export function stripLineRange (rawPath: string): StripLineRangeReturnType {
  const text  = String(rawPath)
  const match = LINE_RANGE_RE.exec(text)
  if (!match)
    return { path: text, range: null }
  return {
    path:  text.slice(0, match.index),
    range: { start: Number(match[1]), end: match[2] ? Number(match[2]) : null },
  }
}

function formatRange ({ start, end }: LineRange): string {
  return end == null ? `line ${start}+` : `lines ${start}-${end}`
}

// Slices the rendered preview to the requested window. Highlighting closes its
// styles per token, so cutting whole lines can't leak an unterminated sequence.
function sliceToRange (content: string, { start, end }: LineRange): string {
  const lines = content.split('\n')
  return lines.slice(Math.max(0, start - 1), end ?? lines.length).join('\n')
}

export interface FileResultOptions extends FilePreviewOptions {

  /** Detail badge verb — mirrors the `type` field Write's tool response carries. */
  action?: string | null;

  /** Window to show. Overrides any `:10-40` suffix carried by the path. */
  range?: LineRange | null;
}

/**
 * Spends what the first fitting render left over, by scaling the budget it was
 * aimed at in proportion to how far under the limit it actually landed.
 *
 * Growth stops at the first candidate that overruns, or that fails to beat the
 * one before it — a picture whose aspect ratio has no larger step available will
 * come back the same size however much room it is offered. Either way the
 * return value is the largest card that was weighed and found to fit.
 */
function growImageCard (
  card: (body: string) => string,
  reRender: (budgetChars: number) => string | null,
  fitted: string,
  budget: number,
): string {
  let best = fitted
  let cost = charCost(best)
  let aim  = budget

  for (let attempt = 0; attempt < GROWTH_ATTEMPTS && cost < budget * GROWTH_THRESHOLD; attempt++) {
    aim = Math.floor(aim * (budget / cost))

    const art = reRender(aim)
    if (!art)
      break

    const candidate     = card(art)
    const candidateCost = charCost(candidate)
    if (candidateCost > budget || candidateCost <= cost)
      break
    best = candidate
    cost = candidateCost
  }

  return best
}

/**
 * The tallest card that fits: text loses lines off the bottom, pictures are
 * re-rendered against a smaller budget so the whole of the image survives.
 */
export function renderFittedFileCard (
  path: string,
  content: string,
  kind: FilePreviewKind,
  details: string | null,
  budget: number,
  reRender?: (budgetChars: number) => string | null,
): string {
  const card = (body: string) => renderFileCard({ path, content: body, details })

  if (kind === 'image' && reRender) {
    let smallest = card(content)
    if (charCost(smallest) <= budget)
      return growImageCard(card, reRender, smallest, budget)

    for (const share of BUDGET_LADDER) {
      const art = reRender(Math.floor(budget * share))
      if (!art)
        continue

      const candidate = card(art)
      if (charCost(candidate) <= budget)
        return candidate
      if (charCost(candidate) < charCost(smallest))
        smallest = candidate
    }

    // Nothing rendered small enough. Shipping the smallest anyway is the one
    // outcome worth avoiding: the transport answers an oversized message by
    // cutting its middle out, and half a picture with a hole in it says less
    // than a line admitting there was no room for one.
    return charCost(smallest) <= budget ? smallest : card(NO_ROOM)
  }

  const full = card(collapsePreview(content))
  if (charCost(full) <= budget)
    return full

  const total = content.split('\n').length
  let low  = 0
  let high = total
  let best = card(collapsePreview(content, { maxLines: 0 }))
  while (low <= high) {
    const retained  = Math.floor((low + high) / 2)
    const candidate = card(collapsePreview(content, { maxLines: retained }))
    if (charCost(candidate) <= budget) {
      best = candidate
      low = retained + 1
    }
    else
      high = retained - 1
  }
  return best
}

// File output is always composed through renderFileCard, which makes the source
// path a title badge instead of relying on each caller to remember it.
export function renderFileResult (rawPath: string, options: FileResultOptions = {}): string | null {
  const { action, range: rangeOverride, budgetChars, ...previewOptions } = options
  const { path: filePath, range: pathRange }                             = stripLineRange(rawPath)
  const range                                                            = rangeOverride ?? pathRange

  const cardBudget = budgetChars ?? previewBudgetChars()
  const preview    = renderFilePreview(filePath, { ...previewOptions, budgetChars: cardBudget })
  if (!preview)
    return null

  const body = range && preview.kind === 'text'
    ? sliceToRange(preview.content, range)
    : preview.content

  const details = [ action, range ? formatRange(range) : null ].filter(Boolean).join('  ')

  return renderFittedFileCard(
    filePath,
    body,
    preview.kind,
    details || null,
    cardBudget,
    preview.kind === 'image'
      ? bytes => renderFilePreview(filePath, { ...previewOptions, budgetChars: bytes })?.content ?? null
      : undefined,
  )
}

export function collapsePreview (content: string, options: SoftCollapseOptions = {}): string {
  return softCollapse(content, { label: 'lines', ...options })
}

export interface InlineImageOptions {

  /** Detail badge verb, as for a file card. */
  action?:      string | null;
  budgetChars?: number;
}

/**
 * A picture that arrived in the tool result itself rather than on disk — a
 * screenshot returned as base64 — drawn through the same fitter as a file card.
 *
 * `label` only names the card; nothing reads it off the filesystem. That is the
 * whole reason this exists next to `renderFileResult` instead of routing through
 * it: the bytes have no path to give the title badge, and inventing a temporary
 * one would put a cache directory in the corner of the box.
 */
export function renderInlineImageResult (
  data: Buffer,
  ext: string,
  label: string,
  options: InlineImageOptions = {},
): string | null {
  const cardBudget = options.budgetChars ?? previewBudgetChars()
  const maxWidth   = getMaxContentWidth()
  const render     = (budgetChars: number): string | null => {
    try {
      return imageToAscii(data, ext, { maxWidth, budget: imageBudget(budgetChars) }) ?? null
    }
    catch {
      return null
    }
  }

  const art = render(cardBudget)
  if (!art)
    return null

  return renderFittedFileCard(label, art, 'image', options.action ?? null, cardBudget, render)
}
