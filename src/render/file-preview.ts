import fs from 'node:fs';
import chalk from 'chalk';
import { imageToAscii } from '@tuomashatakka/image-to-ascii';
import { formatJSON, isJSON, simpleHighlight, langFromPath, detectContentLanguage } from './highlight.ts';
import { getMaxContentWidth, renderBox, softCollapse, type SoftCollapseOptions } from './primitives.ts';

chalk.level = 3;

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

  if (options.fallbackText != null) {
    return { content: shape(options.fallbackText), kind: 'text' };
  }

  if (options.readText === false) return null;

  try {
    return { content: shape(fs.readFileSync(filePath, 'utf8')), kind: 'text' };
  } catch {
    return null;
  }
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
  /** Footer verb — mirrors the `type` field Write's tool response carries. */
  action?: string | null;
  /** Window to show. Overrides any `:10-40` suffix carried by the path. */
  range?: LineRange | null;
}

// The Write PostToolUse block, reusable: file content (highlighted, or ascii for
// images) with a Path/Action footer, all inside one box. MCP file tools return
// an opaque `[{type:"text"}]` payload, so they rebuild this from disk instead.
export function renderFileResult(rawPath: string, options: FileResultOptions = {}): string | null {
  const { action, range: rangeOverride, ...previewOptions } = options;
  const { path: filePath, range: pathRange } = stripLineRange(rawPath);
  const range = rangeOverride ?? pathRange;

  const preview = renderFilePreview(filePath, previewOptions);
  if (!preview) return null;

  const body = range && preview.kind === 'text'
    ? sliceToRange(preview.content, range)
    : preview.content;

  const parts = [collapsePreview(body)];
  parts.push(chalk.cyan('󰈚 ') + chalk.bold('Path: ') + filePath);

  // Footer, not the Path line: a long path gets truncated to the box width and
  // would take the range annotation down with it.
  const footer = [action, range ? formatRange(range) : null].filter(Boolean).join('  ');
  if (footer) parts.push(chalk.cyan('⧖ ') + chalk.bold('Action: ') + footer);

  return renderBox(parts.join('\n\n'));
}

export function collapsePreview(content: string, options: SoftCollapseOptions = {}): string {
  return softCollapse(content, { label: 'lines', ...options });
}

export function prefixPreviewLines(content: string, prefix: string): string {
  return content.split('\n').map(line => prefix + line).join('\n');
}
