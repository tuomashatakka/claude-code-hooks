import fs from 'node:fs'
import path from 'node:path'
import { imageToAscii } from '@tuomashatakka/image-to-ascii'
import type { BudgetSpec } from '@tuomashatakka/image-to-ascii'
import { ink } from '../ansi/chalk.ts'
import { renderText } from '../ansi/highlight.ts'
import { collapse } from '../ansi/text.ts'
import { asRecord, pickString } from '../lib/data.ts'
import { getMaxContentWidth, renderPathCard } from '../tui/index.ts'
import type { BadgeLike } from '../tui/index.ts'
import type { Limit, Render } from './fit.ts'

// Files and pictures as cards. Every renderer here returns a `Render`, so the
// transport decides how much of a file or how large a picture the message can
// afford — a card never has to guess at the room it will ship inside.

const IMAGE_EXTENSIONS = new Set([ '.png', '.jpg', '.jpeg', '.webp' ])

export const extensionOf = (filePath: string | null | undefined): string =>
  path.extname(String(filePath ?? '')).toLowerCase()

export const isImagePath = (filePath: string | null | undefined): boolean =>
  IMAGE_EXTENSIONS.has(extensionOf(filePath))

// wcgw addresses files as `/path/to/file.ts:10-40`.
const LINE_RANGE_RE = /:(\d+)(?:-(\d+)?)?$/

export interface LineRange {
  start: number;
  end:   number | null;
}

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

const formatRange = ({ start, end }: LineRange): string =>
  end == null ? `line ${start}+` : `lines ${start}-${end}`

// Highlighting closes its styles per token, so slicing whole lines is safe.
function sliceToRange (content: string, { start, end }: LineRange): string {
  const lines = content.split('\n')
  return lines.slice(Math.max(0, start - 1), end ?? lines.length).join('\n')
}

function readFile (filePath: string): Buffer | null {
  try {
    return fs.readFileSync(filePath)
  }
  catch {
    return null
  }
}

// ------------------------------------------------------------------- images

/**
 * What a picture may spend for a card of `chars`. The wrapper costs are
 * measured off compacted cards: title row, top rule and blank rows once; per
 * row the 256-colour fill, two columns of padding each side, the fill's
 * re-open after the picture's own background reset, the closing reset and
 * the newline. Rough is fine — the transport re-fits anyway.
 */
const CARD_CHROME  = 300
const CARD_PER_ROW = 34

const imageBudget = (chars: number): BudgetSpec =>
  ({ total: Math.max(600, chars), overhead: CARD_CHROME, perRow: CARD_PER_ROW })

const NO_ROOM = ink.note('… image preview omitted — no room left in this message …')

function drawImage (data: Buffer, ext: string, chars: number): string | null {
  try {
    return imageToAscii(data, ext, { maxWidth: getMaxContentWidth(), budget: imageBudget(chars) })
  }
  catch {
    return null
  }
}

/** A picture as a card body, sized to the limit; the placeholder when none fits. */
const imageBody = (data: Buffer, ext: string) => (limit: Limit): string =>
  drawImage(data, ext, limit.chars) ?? NO_ROOM

// ---------------------------------------------------------------- file cards

export interface FileCardOptions {

  /** Detail badge verb: `read`, `edit`, `screenshot`… */
  action?: string | null;

  /** Window to show. Overrides a `:10-40` suffix on the path. */
  range?: LineRange | null;

  /** Text to show when the file cannot be read from disk. */
  fallbackText?: string | null;

  /** Skip the disk read for text (pictures are still drawn). */
  readText?: boolean;

  /** Reshape raw text before highlighting — e.g. drop a bulky trailer. */
  transform?: ((raw: string) => string) | null;
  badges?:    readonly BadgeLike[];
}

interface FileBody {
  kind: 'image' | 'text';
  draw: Render;
}

function fileBody (filePath: string, options: FileCardOptions): FileBody | null {
  const ext = extensionOf(filePath)
  if (isImagePath(filePath)) {
    const data = readFile(filePath)
    if (data && drawImage(data, ext, 4_000))
      return { kind: 'image', draw: imageBody(data, ext) }
  }

  const raw  = options.readText === false ? null : readFile(filePath)?.toString('utf8') ?? null
  const text = raw ?? options.fallbackText
  if (text == null)
    return null

  const shaped = renderText(options.transform ? options.transform(text) : text, filePath)
  const body   = options.range ? sliceToRange(shaped, options.range) : shaped
  return { kind: 'text', draw: limit => collapse(body, limit.lines) }
}

/**
 * A file as a card titled by its path — the picture drawn in ASCII, text
 * highlighted by extension, either one sized to the limit it is rendered at.
 * Null when there is nothing to show for the path.
 */
export function fileCard (rawPath: string, options: FileCardOptions = {}): Render | null {
  const { path: filePath, range: pathRange } = stripLineRange(rawPath)
  const range                                = options.range ?? pathRange
  const body                                 = fileBody(filePath, { ...options, range })
  if (!body)
    return null

  const details = [ options.action, range && body.kind === 'text' ? formatRange(range) : null ]
    .filter(Boolean)
    .join('  ') || null
  return limit => renderPathCard({
    path:    filePath,
    content: body.draw(limit),
    details,
    badges:  options.badges,
    picture: body.kind === 'image',
  })
}

/**
 * A picture that arrived in the result rather than on disk — a screenshot
 * returned as base64. `label` only names the card.
 */
export function inlineImageCard (data: Buffer, ext: string, label: string, action: string | null = null): Render | null {
  if (!drawImage(data, ext, 4_000))
    return null

  const draw = imageBody(data, ext)
  return limit => renderPathCard({ path: label, content: draw(limit), details: action, picture: true })
}

// ----------------------------------------------------------- finding images

const QUOTED_CANDIDATE_RE  = /["']([^"'\n]+\.(?:png|jpe?g|webp))["']/gi
const CANDIDATE_RE         = /[^\s"'`,;<>|()[\]{}]+\.(?:png|jpe?g|webp)/gi
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"`]+$/

function isReadableFile (candidate: string): boolean {
  try {
    return fs.statSync(candidate).isFile()
  }
  catch {
    return false
  }
}

/** First path in `text` naming a picture actually present on disk. */
export function findImagePath (text: string | null | undefined, cwd: string = process.cwd()): string | null {
  if (!text)
    return null

  const source     = String(text)
  const candidates = [
    ...Array.from(source.matchAll(QUOTED_CANDIDATE_RE), match => match[1]!),
    ...Array.from(source.matchAll(CANDIDATE_RE), match => match[0]),
  ]
  for (const raw of candidates) {
    const candidate = raw.replace(TRAILING_PUNCTUATION, '')
    if (!isImagePath(candidate))
      continue

    const resolved = path.isAbsolute(candidate) ? candidate : path.resolve(cwd, candidate)
    if (isReadableFile(resolved))
      return resolved
  }
  return null
}

export interface InlineImage {
  data: Buffer;
  ext:  string;
}

const MIME_EXTENSIONS: Record<string, string> = { png: '.png', jpeg: '.jpg', jpg: '.jpg', webp: '.webp' }

function inlineImageOf (value: unknown): InlineImage | null {
  const block = asRecord(value)
  if (!block || block.type !== 'image' && block.type !== 'input_image')
    return null

  const dataUrl = typeof block.image_url === 'string' ? (/^data:image\/([^;,]+);base64,(.+)$/s).exec(block.image_url) : null
  const encoded = pickString(block, 'data') ?? dataUrl?.[2]
  if (!encoded)
    return null

  const subtype = String(block.mimeType ?? `image/${dataUrl?.[1] ?? 'png'}`).split('/')[1]?.toLowerCase() ?? 'png'
  const ext     = MIME_EXTENSIONS[subtype]
  return ext ? { data: Buffer.from(encoded, 'base64'), ext } : null
}

/** A base64 picture carried in a result's content blocks. */
export function findInlineImage (result: unknown): InlineImage | null {
  const direct = inlineImageOf(result)
  if (direct)
    return direct

  const content = asRecord(result)?.content
  return Array.isArray(content) ? content.map(inlineImageOf).find(Boolean) ?? null : null
}

/**
 * The picture a screenshot-taking tool produced, as a card — or null for every
 * operation that is not a screenshot. A named file beats inline bytes: same
 * picture, and the card gets a real path for its title.
 */
export function screenshotCard (result: unknown, text: string | null | undefined, action = 'screenshot'): Render | null {
  const file = findImagePath(text)
  if (file)
    return fileCard(file, { action })

  const inline = findInlineImage(result)
  return inline ? inlineImageCard(inline.data, inline.ext, `screenshot${inline.ext}`, action) : null
}
