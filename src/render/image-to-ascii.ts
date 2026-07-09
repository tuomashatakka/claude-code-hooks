import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

declare module 'jpeg-js' {
  export function decode(
    buf: Buffer | Uint8Array,
    opts?: { useTArray?: boolean }
  ): { width: number; height: number; data: Uint8Array };
}

const RAMP = ' .:-=+*#%@';
const MAX_ROWS = 45;   // keep previews to a compact thumbnail (≤ softCollapse's 60 cap)
const QUANT = 0xf8;    // 5-bit/channel: collapse near-identical neighbours into one colour run

interface RGBAImage {
  width: number;
  height: number;
  data: Uint8Array | Buffer;
}

interface Cell {
  r: number;
  g: number;
  b: number;
  a: number;
  l: number; // luminance 0..255
}

// pngjs/jpeg-js can't read WebP's VP8/VP8L codecs. On macOS, `sips` transcodes
// webp -> png in a temp file so we can reuse the existing PNG path. Throws if
// `sips` is absent (non-macOS) or the file is undecodable — the caller's
// try/catch then falls back to "unsupported" (null), same as before.
function decodeWebp(buffer: Buffer): RGBAImage {
  const base = path.join(os.tmpdir(), `claude-webp-${process.pid}-${Date.now()}`);
  const inPath = `${base}.webp`;
  const outPath = `${base}.png`;
  try {
    fs.writeFileSync(inPath, buffer);
    execFileSync('sips', ['-s', 'format', 'png', inPath, '--out', outPath], { stdio: 'ignore' });
    return PNG.sync.read(fs.readFileSync(outPath));
  } finally {
    try { fs.unlinkSync(inPath); } catch {}
    try { fs.unlinkSync(outPath); } catch {}
  }
}

export function imageToAscii(buffer: Buffer, ext: string, maxWidth: number = 80): string | null {
  let img: RGBAImage;
  const normalizedExt = ext.toLowerCase().replace(/^\./, '');
  try {
    if (normalizedExt === 'png') {
      img = PNG.sync.read(buffer);
    } else if (normalizedExt === 'jpg' || normalizedExt === 'jpeg') {
      img = jpeg.decode(buffer, { useTArray: true });
    } else if (normalizedExt === 'webp') {
      img = decodeWebp(buffer);
    } else {
      return null;
    }
  } catch {
    return null;
  }

  const { width, height, data } = img;
  if (!width || !height) return null;

  // Terminal characters are roughly twice as tall as they are wide.
  const targetWidth = Math.min(width, maxWidth);
  const scaleX = width / targetWidth;
  const scaleY = scaleX * 2.0;
  // Clamp height so a very tall image (e.g. a full-page screenshot) previews as a
  // compact proportional thumbnail instead of building hundreds of rows.
  const targetHeight = Math.min(MAX_ROWS, Math.max(1, Math.round(height / scaleY)));

  // Pass 1 — sample cells and track the luminance range of opaque pixels so we can
  // stretch contrast; without this a flat/light screenshot maps to a single glyph.
  const cells: Cell[] = new Array(targetWidth * targetHeight);
  let minL = 255;
  let maxL = 0;
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const origX = Math.min(width - 1, Math.floor(x * scaleX));
      const origY = Math.min(height - 1, Math.floor(y * scaleY));
      const idx = (origY * width + origX) * 4;

      const r = data[idx] ?? 0;
      const g = data[idx + 1] ?? 0;
      const b = data[idx + 2] ?? 0;
      const a = data[idx + 3] ?? 255;
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      if (a !== 0) {
        if (l < minL) minL = l;
        if (l > maxL) maxL = l;
      }
      cells[y * targetWidth + x] = { r, g, b, a, l };
    }
  }

  const range = maxL - minL;

  // Pass 2 — build each line, emitting a truecolor SGR only when the (quantized)
  // colour changes plus one reset per line. This run-length encodes the escape
  // codes so the output stays a few KB rather than ~20 bytes per glyph.
  const lines: string[] = [];
  for (let y = 0; y < targetHeight; y++) {
    let line = '';
    let prevKey = '';
    let colorActive = false;
    for (let x = 0; x < targetWidth; x++) {
      const c = cells[y * targetWidth + x]!;

      if (c.a === 0) {
        line += ' ';
        continue;
      }

      const norm = range > 0 ? (c.l - minL) / range : c.l / 255;
      const rampIdx = Math.min(RAMP.length - 1, Math.max(0, Math.floor(norm * RAMP.length)));
      const char = RAMP[rampIdx] ?? ' ';

      // A space has no ink, so skip its colour code entirely (saves bytes on dark
      // regions) and leave the current colour run intact for the next glyph.
      if (char === ' ') {
        line += ' ';
        continue;
      }

      const qr = c.r & QUANT;
      const qg = c.g & QUANT;
      const qb = c.b & QUANT;
      const key = `${qr};${qg};${qb}`;
      if (key !== prevKey) {
        line += `\x1b[38;2;${qr};${qg};${qb}m`;
        prevKey = key;
        colorActive = true;
      }
      line += char;
    }
    if (colorActive) line += '\x1b[39m';
    lines.push(line);
  }

  return lines.join('\n');
}
