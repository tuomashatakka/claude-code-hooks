import fs from 'node:fs';
import path from 'node:path';
import {
  isImageExtension,
  extensionFromPath,
  renderFileResult,
  renderInlineImageResult,
} from './file-preview.ts';

/**
 * A screenshot tool's actual result is the picture. Everything it prints around
 * it — "Took the viewport screenshot and saved it as …", a JSON blob naming the
 * file and its dimensions — describes something the terminal could simply show,
 * so these helpers find the image and hand it to the file-card renderer.
 *
 * The path is read out of the *result* rather than the tool's arguments because
 * the argument is relative to an output directory the tool picks and never
 * states: `filename: 'shot.png'` lands somewhere under a browser profile that
 * only the result names in full.
 */

/** Anything that could be a path to a picture. Verified against disk after. */
const CANDIDATE_RE = /[^\s"'`,;<>|()[\]{}]+\.(?:png|jpe?g|webp)/gi;

/** Trailing punctuation a sentence leaves stuck to a path. */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"`]+$/;

function isReadableFile(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

/**
 * First path in `text` that names a picture actually present on disk.
 *
 * Relative names are resolved against `cwd`, which is where the tool ran — a
 * hook is spawned in the same working directory, so the two agree.
 */
export function findImagePath(text: string | null | undefined, cwd: string = process.cwd()): string | null {
  if (!text) return null;

  for (const match of String(text).matchAll(CANDIDATE_RE)) {
    const candidate = match[0].replace(TRAILING_PUNCTUATION, '');
    if (!isImageExtension(extensionFromPath(candidate))) continue;
    const resolved = path.isAbsolute(candidate) ? candidate : path.resolve(cwd, candidate);
    if (isReadableFile(resolved)) return resolved;
  }

  return null;
}

interface InlineImage {
  data: Buffer;
  ext: string;
}

/** MIME subtypes worth decoding, mapped to the extension the decoder wants. */
const MIME_EXTENSIONS: Record<string, string> = {
  png: '.png',
  jpeg: '.jpg',
  jpg: '.jpg',
  webp: '.webp',
};

function inlineImageFrom(value: unknown): InlineImage | null {
  if (!value || typeof value !== 'object') return null;
  const block = value as { type?: unknown; data?: unknown; mimeType?: unknown };
  if (block.type !== 'image' || typeof block.data !== 'string' || !block.data) return null;

  const subtype = String(block.mimeType ?? 'image/png').split('/')[1]?.toLowerCase() ?? 'png';
  const ext = MIME_EXTENSIONS[subtype];
  if (!ext) return null;

  try {
    return { data: Buffer.from(block.data, 'base64'), ext };
  } catch {
    return null;
  }
}

/**
 * A base64 picture carried in the result's content blocks. MCP tools that
 * return a screenshot inline put it here rather than naming a file, so this is
 * the path that has no path.
 */
export function findInlineImage(result: unknown): InlineImage | null {
  if (!result || typeof result !== 'object') return null;

  const direct = inlineImageFrom(result);
  if (direct) return direct;

  const content = (result as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;

  for (const block of content) {
    const image = inlineImageFrom(block);
    if (image) return image;
  }

  return null;
}

/**
 * The picture a browser tool produced, as a finished card — or null when the
 * result names none, which is every operation that is not a screenshot.
 *
 * A named file is preferred over inline bytes: it is the same picture, and the
 * card gets a real path for its title badge instead of a placeholder.
 */
export function renderScreenshot(
  result: unknown,
  text: string | null | undefined,
  action = 'screenshot',
): string | null {
  const file = findImagePath(text);
  if (file) return renderFileResult(file, { action });

  const inline = findInlineImage(result);
  if (inline) return renderInlineImageResult(inline.data, inline.ext, `screenshot${inline.ext}`, { action });

  return null;
}
