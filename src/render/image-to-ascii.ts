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

const MAX_ROWS = 120;       // downscale bound for very tall images — resizes, never crops
const ALPHA_OPAQUE = 128;   // below this a pixel renders as the terminal's own background
const FG_RESET = '\x1b[39m';
const BG_RESET = '\x1b[49m';

interface RGBAImage {
  width: number;
  height: number;
  data: Uint8Array | Buffer;
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

  // Half-block rendering: a terminal cell is ~2:1 tall, and each cell holds two
  // vertically stacked pixels (▀ with fg = top pixel, bg = bottom pixel), so the
  // sampling grid uses a square pixel aspect. Never upscale.
  const scale = Math.max(1, width / maxWidth, height / (MAX_ROWS * 2));
  const targetWidth = Math.max(1, Math.round(width / scale));
  const pxRows = Math.max(1, Math.round(height / scale));

  // Nearest-neighbour sample -> "r;g;b" SGR fragment, or null for transparent.
  const px = (col: number, row: number): string | null => {
    const idx =
      (Math.min(height - 1, Math.floor(row * scale)) * width +
        Math.min(width - 1, Math.floor(col * scale))) * 4;
    if ((data[idx + 3] ?? 255) < ALPHA_OPAQUE) return null;
    return `${data[idx] ?? 0};${data[idx + 1] ?? 0};${data[idx + 2] ?? 0}`;
  };

  // Emit a truecolor SGR only when that component changes (run-length encoding),
  // so the output stays a few KB rather than ~40 bytes per cell.
  const lines: string[] = [];
  for (let y = 0; y < pxRows; y += 2) {
    let line = '';
    let fg: string | null = null;
    let bg: string | null = null;
    const setFg = (key: string) => {
      if (key !== fg) { line += `\x1b[38;2;${key}m`; fg = key; }
    };
    const setBg = (key: string | null) => {
      if (key !== bg) { line += key === null ? BG_RESET : `\x1b[48;2;${key}m`; bg = key; }
    };
    for (let x = 0; x < targetWidth; x++) {
      const top = px(x, y);
      const bottom = y + 1 < pxRows ? px(x, y + 1) : null;
      if (top === null && bottom === null) {
        setBg(null);          // a space shows the background — make sure it's the terminal's
        line += ' ';
      } else if (top !== null && bottom === null) {
        setFg(top);
        setBg(null);
        line += '▀';
      } else if (top === null && bottom !== null) {
        setFg(bottom);
        setBg(null);
        line += '▄';
      } else if (top === bottom) {
        setFg(top!);          // full block hides the background — skip bg churn
        line += '█';
      } else {
        setFg(top!);
        setBg(bottom);
        line += '▀';
      }
    }
    if (fg !== null) line += FG_RESET;
    if (bg !== null) line += BG_RESET;
    lines.push(line);
  }

  return lines.join('\n');
}
