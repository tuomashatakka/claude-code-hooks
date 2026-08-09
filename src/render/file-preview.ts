import fs from 'node:fs';
import { imageToAscii } from '@tuomashatakka/image-to-ascii';
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
      const ascii = imageToAscii(fs.readFileSync(filePath), ext, maxWidth);
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

/** Widths to try for a picture, largest first. */
function widthLadder(maxWidth: number): number[] {
  const rungs: number[] = [];
  for (let width = maxWidth; width >= 16; width = Math.floor(width * 0.75)) rungs.push(width);
  return rungs;
}

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
  /** Share of the response this card may spend. Split it when drawing several. */
  budgetBytes?: number;
}

/**
 * The tallest card that fits: text loses lines off the bottom, pictures are
 * re-rendered narrower so the whole of the image survives.
 */
export function renderFittedFileCard(
  path: string,
  content: string,
  kind: FilePreviewKind,
  details: string | null,
  budget: number,
  reRender?: (width: number) => string | null,
): string {
  const card = (body: string) => renderFileCard({ path, content: body, details });

  if (kind === 'image' && reRender) {
    let smallest = card(content);
    for (const width of widthLadder(getMaxContentWidth())) {
      const art = reRender(width);
      if (!art) continue;
      smallest = card(art);
      if (jsonBytes(smallest) <= budget) return smallest;
    }
    return smallest;
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

  const preview = renderFilePreview(filePath, previewOptions);
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
    budgetBytes ?? previewBudgetBytes(),
    preview.kind === 'image'
      ? width => renderFilePreview(filePath, { ...previewOptions, maxWidth: width })?.content ?? null
      : undefined,
  );
}

export function collapsePreview(content: string, options: SoftCollapseOptions = {}): string {
  return softCollapse(content, { label: 'lines', ...options });
}
