import fs from 'node:fs';
import { imageToAscii } from './image-to-ascii.ts';
import { formatJSON, isJSON, simpleHighlight, langFromPath, detectContentLanguage } from './highlight.ts';
import { getMaxContentWidth, softCollapse, type SoftCollapseOptions } from './primitives.ts';

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

  if (options.fallbackText != null) {
    return { content: renderTextPreview(options.fallbackText, filePath), kind: 'text' };
  }

  if (options.readText === false) return null;

  try {
    return { content: renderTextPreview(fs.readFileSync(filePath, 'utf8'), filePath), kind: 'text' };
  } catch {
    return null;
  }
}

export function collapsePreview(content: string, options: SoftCollapseOptions = {}): string {
  return softCollapse(content, { label: 'lines', ...options });
}

export function prefixPreviewLines(content: string, prefix: string): string {
  return content.split('\n').map(line => prefix + line).join('\n');
}
