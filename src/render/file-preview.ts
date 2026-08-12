import chalk from 'chalk';
import fs from 'node:fs';
import { imageToAscii, type BudgetSpec } from '@tuomashatakka/image-to-ascii';
import { formatJSON, isJSON, simpleHighlight, langFromPath, detectContentLanguage } from './highlight.ts';
import { softCollapse, type SoftCollapseOptions } from './primitives.ts';
import { getMaxContentWidth, renderFileCard } from '../tui/index.ts';
import { HOOK_RESPONSE_BYTE_BUDGET } from '../runtime/output-transport.ts';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

export type FilePreviewKind = 'image' | 'text';

export interface FilePreview {
  content: string;
  kind: FilePreviewKind;
}

export interface FilePreviewOptions {
  fallbackText?: string | null;
  readText?: boolean;
  maxWidth?: number;
  /** JSON bytes the finished *card* may cost. Images are sized to it. */
  budgetBytes?: number;
  /** Reshape the raw text before highlighting — e.g. drop a bulky trailer. */
  transform?: ((raw: string) => string) | null;
}

export function extensionFromPath(filePath: string | null | undefined): string {
  const match = String(filePath ?? '').match(/\.([^./\\\s]+)$/);
  return match ? `.${match[1]!.toLowerCase()}` : '';
}

export function isImageExtension(ext: string | null | undefined): boolean {
  return IMAGE_EXTENSIONS.has(String(ext ?? '').toLowerCase().replace(/^\./, ''));
}

export function isImagePath(filePath: string | null | undefined): boolean {
  return isImageExtension(extensionFromPath(filePath));
}

export function renderTextPreview(content: string, filePath?: string | null): string {
  const lang = langFromPath(filePath) ?? detectContentLanguage(content);
  if (isJSON(content)) return simpleHighlight(formatJSON(content), 'json');
  return lang ? simpleHighlight(content, lang) : content;
}

export function renderFilePreview(filePath: string, options: FilePreviewOptions = {}): FilePreview | null {
  const ext = extensionFromPath(filePath);
  const maxWidth = options.maxWidth ?? getMaxContentWidth();

  if (isImageExtension(ext)) {
    try {
      const ascii = imageToAscii(fs.readFileSync(filePath), ext, {
        maxWidth,
        budget: imageBudget(options.budgetBytes ?? previewBudgetBytes()),
      });
      if (ascii) return { content: ascii, kind: 'image' };
    } catch {}
  }

  const shape = (raw: string) => renderTextPreview(options.transform ? options.transform(raw) : raw, filePath);

  if (options.readText !== false) {
    try {
      return { content: shape(fs.readFileSync(filePath, 'utf8')), kind: 'text' };
    } catch {}
  }

  return options.fallbackText == null
    ? null
    : { content: shape(options.fallbackText), kind: 'text' };
}

/* ------------------------------------------------------------------ budget --
 *
 * What a preview may cost, and how that cost is decided: not modelled, but
 * measured. Predicting the size of a rendered card means predicting how chalk
 * rewrites nested styles inside a background fill, and every estimate of that
 * came out low by a factor of three.
 *
 * Being wrong is expensive. The transport's answer to an oversized message is
 * to cut its middle out, so a mis-sized picture arrives with a hole in it. So
 * the card is rendered, weighed on the scale that actually decides — JSON bytes
 * of the finished card — and rendered again smaller until it fits.
 */

/** Badges, duration line and the rest of the response around the card. */
const SECTION_RESERVE = 1_400;

/** Bytes one card may spend, unless the caller is drawing several. */
export function previewBudgetBytes(): number {
  return Math.max(1_200, HOOK_RESPONSE_BYTE_BUDGET - SECTION_RESERVE);
}

function jsonBytes(text: string): number {
  return Buffer.byteLength(JSON.stringify(text), 'utf8');
}

/**
 * What the picture inside a card is really charged, so the renderer can size
 * itself once instead of being re-measured into place.
 *
 * The three surcharges are the three ways the naive count — characters the
 * renderer emitted — comes out low: the response is JSON, where one ESC costs
 * six bytes; the glyphs are astral, where one character costs four; and the
 * card pads every row out to its own width in a background fill and closes it
 * with an SGR pair. The constants below are measured off rendered cards rather
 * than derived, because deriving them means predicting how chalk rewrites
 * nested styles, and every attempt at that came out low by a factor of three.
 */
const JSON_ESCAPE_SURCHARGE = 5;  // the five extra bytes of a JSON-escaped ESC
const CARD_CHROME = 1_450;        // title badge, both edges, footer, shadow
const CARD_PER_ROW = 150;         // background fill, its SGR pair, the newline

function imageBudget(cardBytes: number): BudgetSpec {
  return {
    total: Math.max(600, cardBytes),
    bytes: true,
    escapeSurcharge: JSON_ESCAPE_SURCHARGE,
    overhead: CARD_CHROME,
    perRow: CARD_PER_ROW,
  };
}

/**
 * Shares of the card budget to re-render a picture against, should the measured
 * card still land over it. Modelling the wrapper gets close, not exact, so the
 * ladder buys the slack back — and it is a *budget* ladder rather than the width
 * ladder it replaces, because width is not the axis that shrinks a tall image:
 * a 40x4000 source renders two columns wide however much room it is given.
 */
const BUDGET_LADDER = [0.75, 0.5, 0.3, 0.15];

/** Stands in for a picture that no budget could fit. */
const NO_ROOM = chalk.gray.italic('… image preview omitted — no room left in this message …');

// wcgw addresses files as `/path/to/file.ts:10-40`. Split the range off so the
// path still resolves on disk, and keep it around to show alongside the box.
const LINE_RANGE_RE = /:(\d+)(?:-(\d+)?)?$/;

export interface LineRange { start: number; end: number | null }

export function stripLineRange(rawPath: string): { path: string; range: LineRange | null } {
  const text  = String(rawPath);
  const match = LINE_RANGE_RE.exec(text);
  if (!match) return { path: text, range: null };
  return {
    path: text.slice(0, match.index),
    range: { start: Number(match[1]), end: match[2] ? Number(match[2]) : null },
  };
}

function formatRange({ start, end }: LineRange): string {
  return end == null ? `line ${start}+` : `lines ${start}-${end}`;
}

// Slices the rendered preview to the requested window. Highlighting closes its
// styles per token, so cutting whole lines can't leak an unterminated sequence.
function sliceToRange(content: string, { start, end }: LineRange): string {
  const lines = content.split('\n');
  return lines.slice(Math.max(0, start - 1), end ?? lines.length).join('\n');
}

export interface FileResultOptions extends FilePreviewOptions {
  /** Detail badge verb — mirrors the `type` field Write's tool response carries. */
  action?: string | null;
  /** Window to show. Overrides any `:10-40` suffix carried by the path. */
  range?: LineRange | null;
}

/**
 * The tallest card that fits: text loses lines off the bottom, pictures are
 * re-rendered against a smaller budget so the whole of the image survives.
 */
export function renderFittedFileCard(
  path: string,
  content: string,
  kind: FilePreviewKind,
  details: string | null,
  budget: number,
  reRender?: (budgetBytes: number) => string | null,
): string {
  const card = (body: string) => renderFileCard({ path, content: body, details });

  if (kind === 'image' && reRender) {
    let smallest = card(content);
    if (jsonBytes(smallest) <= budget) return smallest;

    for (const share of BUDGET_LADDER) {
      const art = reRender(Math.floor(budget * share));
      if (!art) continue;
      const candidate = card(art);
      if (jsonBytes(candidate) <= budget) return candidate;
      if (jsonBytes(candidate) < jsonBytes(smallest)) smallest = candidate;
    }

    // Nothing rendered small enough. Shipping the smallest anyway is the one
    // outcome worth avoiding: the transport answers an oversized message by
    // cutting its middle out, and half a picture with a hole in it says less
    // than a line admitting there was no room for one.
    return jsonBytes(smallest) <= budget ? smallest : card(NO_ROOM);
  }

  const full = card(collapsePreview(content));
  if (jsonBytes(full) <= budget) return full;

  const total = content.split('\n').length;
  let low = 0;
  let high = total;
  let best = card(collapsePreview(content, { maxLines: 0 }));
  while (low <= high) {
    const retained = Math.floor((low + high) / 2);
    const candidate = card(collapsePreview(content, { maxLines: retained }));
    if (jsonBytes(candidate) <= budget) {
      best = candidate;
      low = retained + 1;
    } else {
      high = retained - 1;
    }
  }
  return best;
}

// File output is always composed through renderFileCard, which makes the source
// path a title badge instead of relying on each caller to remember it.
export function renderFileResult(rawPath: string, options: FileResultOptions = {}): string | null {
  const { action, range: rangeOverride, budgetBytes, ...previewOptions } = options;
  const { path: filePath, range: pathRange } = stripLineRange(rawPath);
  const range = rangeOverride ?? pathRange;

  const cardBudget = budgetBytes ?? previewBudgetBytes();
  const preview = renderFilePreview(filePath, { ...previewOptions, budgetBytes: cardBudget });
  if (!preview) return null;

  const body = range && preview.kind === 'text'
    ? sliceToRange(preview.content, range)
    : preview.content;

  const details = [action, range ? formatRange(range) : null].filter(Boolean).join('  ');

  return renderFittedFileCard(
    filePath,
    body,
    preview.kind,
    details || null,
    cardBudget,
    preview.kind === 'image'
      ? bytes => renderFilePreview(filePath, { ...previewOptions, budgetBytes: bytes })?.content ?? null
      : undefined,
  );
}

export function collapsePreview(content: string, options: SoftCollapseOptions = {}): string {
  return softCollapse(content, { label: 'lines', ...options });
}
