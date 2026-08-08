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
// Claude Code replaces any hook systemMessage over 10,000 chars with a persisted-output
// stub (2KB preview), so the render must fit the whole message with headroom for the
// badge header. Quality degrades stepwise: full 24-bit color first, then channel
// quantization (which lengthens RLE runs), then narrower output as a last resort.
const BYTE_BUDGET = 9200;   // io.ts trims the whole message at 9900 — leave header room
// Quality ladder per width: exact 24-bit first, gentle quantization (longer RLE runs),
// then xterm-256 (codes are half the bytes of truecolor and its 6-level cube + 24-step
// gray ramp beats heavy channel masking) — only then a narrower render.
const ATTEMPTS: ReadonlyArray<{ mask: number; palette?: false } | { palette: true }> = [
  { mask: 0xff }, { mask: 0xfc }, { mask: 0xf8 }, { palette: true },
];
const MIN_COLS = 24;

// Nearest xterm-256 index: 24-step grayscale ramp for near-neutral colors (finer than
// the cube's 6 gray levels), 6x6x6 color cube otherwise.
const cubeIdx = (v: number) => (v < 48 ? 0 : v < 115 ? 1 : Math.min(5, Math.round((v - 35) / 40)));
function to256(r: number, g: number, b: number): number {
  if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && Math.abs(r - b) < 12) {
    if (r < 8) return 16;
    if (r > 238) return 231;
    return 232 + Math.min(23, Math.round((r - 8) / 10));
  }
  return 16 + 36 * cubeIdx(r) + 6 * cubeIdx(g) + cubeIdx(b);
}
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

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface Sample extends RGB {
  opaque: boolean;
}

interface Cell {
  char: string;
  fg: RGB | null;
  bg: RGB | null;
}

// Unicode's block-sextant series contains every 2x3 mask except the existing
// left/right half blocks (masks 135 and 246). The code points are otherwise in
// ascending mask order. Separated sextants are a complete linear series, but
// this package intentionally stops at the requested U+1CE86 / mask 2356.
const LEFT_HALF_MASK = 0b010101;
const RIGHT_HALF_MASK = 0b101010;
const LAST_SEPARATED_MASK = 0b110110;

export function regularSextant(mask: number): string {
  if (mask <= 0) return ' ';
  if (mask >= 0b111111) return '█';
  if (mask === LEFT_HALF_MASK) return '▌';
  if (mask === RIGHT_HALF_MASK) return '▐';
  const skippedLeft = mask > LEFT_HALF_MASK ? 1 : 0;
  const skippedRight = mask > RIGHT_HALF_MASK ? 1 : 0;
  return String.fromCodePoint(0x1fb00 + mask - 1 - skippedLeft - skippedRight);
}

export function separatedSextant(mask: number): string | null {
  return mask >= 1 && mask <= LAST_SEPARATED_MASK
    ? String.fromCodePoint(0x1ce50 + mask)
    : null;
}

function mean(samples: readonly Sample[], mask: number, selected: boolean): RGB {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < samples.length; i++) {
    if (Boolean(mask & (1 << i)) !== selected) continue;
    r += samples[i]!.r;
    g += samples[i]!.g;
    b += samples[i]!.b;
    count++;
  }
  return count
    ? { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) }
    : { r: 0, g: 0, b: 0 };
}

function colorError(sample: Sample, color: RGB): number {
  const dr = sample.r - color.r;
  const dg = sample.g - color.g;
  const db = sample.b - color.b;
  return dr * dr + dg * dg + db * db;
}

function opaqueCell(samples: readonly Sample[]): Cell {
  const flat = mean(samples, 0, false);
  let bestError = samples.reduce((sum, sample) => sum + colorError(sample, flat), 0);
  let best: Cell = { char: '█', fg: flat, bg: null };

  // Six samples make exhaustive two-cluster fitting cheap (62 candidates).
  // Complementary masks are retained because foreground/background ordering
  // affects ANSI run lengths even though their color reconstruction is equal.
  for (let mask = 1; mask < 0b111111; mask++) {
    const fg = mean(samples, mask, true);
    const bg = mean(samples, mask, false);
    let error = 0;
    for (let i = 0; i < samples.length; i++) {
      error += colorError(samples[i]!, mask & (1 << i) ? fg : bg);
    }
    if (error < bestError) {
      bestError = error;
      best = { char: regularSextant(mask), fg, bg };
    }
  }
  return best;
}

function transparentCell(samples: readonly Sample[]): Cell {
  let mask = 0;
  const opaque: Sample[] = [];
  for (let i = 0; i < samples.length; i++) {
    if (!samples[i]!.opaque) continue;
    mask |= 1 << i;
    opaque.push(samples[i]!);
  }
  if (!mask) return { char: ' ', fg: null, bg: null };
  const fg = mean(opaque, (1 << opaque.length) - 1, true);
  return {
    // Separated cells keep the terminal background visible between isolated
    // transparent-edge samples. Masks beyond the requested cutoff use the
    // classic series rather than silently pulling in U+1CE87..U+1CE8F.
    char: separatedSextant(mask) ?? regularSextant(mask),
    fg,
    bg: null,
  };
}

function fitGeometry(width: number, height: number, requestedCols: number): { cols: number; rows: number } {
  let cols = Math.max(1, Math.min(requestedCols, Math.ceil(width / 2)));
  let rows = Math.max(1, Math.round((height * cols) / (width * 2)));
  if (rows > MAX_ROWS) {
    cols = Math.max(1, Math.floor((cols * MAX_ROWS) / rows));
    rows = Math.max(1, Math.min(MAX_ROWS, Math.round((height * cols) / (width * 2))));
  }
  return { cols, rows };
}

function imageSample(
  img: RGBAImage,
  sampleX: number,
  sampleY: number,
  sampleCols: number,
  sampleRows: number,
): Sample {
  const x = Math.min(img.width - 1, Math.floor(((sampleX + 0.5) * img.width) / sampleCols));
  const y = Math.min(img.height - 1, Math.floor(((sampleY + 0.5) * img.height) / sampleRows));
  const idx = (y * img.width + x) * 4;
  return {
    r: img.data[idx] ?? 0,
    g: img.data[idx + 1] ?? 0,
    b: img.data[idx + 2] ?? 0,
    opaque: (img.data[idx + 3] ?? 255) >= ALPHA_OPAQUE,
  };
}

function renderSextants(
  img: RGBAImage,
  requestedCols: number,
  attempt: (typeof ATTEMPTS)[number],
): string {
  const { cols, rows } = fitGeometry(img.width, img.height, requestedCols);
  const sampleCols = cols * 2;
  const sampleRows = rows * 3;
  const sgrTail = attempt.palette
    ? (color: RGB) => `5;${to256(color.r, color.g, color.b)}`
    : (color: RGB) => `2;${color.r & attempt.mask};${color.g & attempt.mask};${color.b & attempt.mask}`;
  const lines: string[] = [];

  for (let cellY = 0; cellY < rows; cellY++) {
    let line = '';
    let fg: string | null = null;
    let bg: string | null = null;
    const put = (cell: Cell) => {
      const wantFg = cell.fg ? sgrTail(cell.fg) : null;
      const wantBg = cell.bg ? sgrTail(cell.bg) : null;
      const parts: string[] = [];
      if (wantFg !== null && wantFg !== fg) { parts.push(`38;${wantFg}`); fg = wantFg; }
      if (wantBg !== bg) { parts.push(wantBg === null ? '49' : `48;${wantBg}`); bg = wantBg; }
      line += parts.length ? `\x1b[${parts.join(';')}m${cell.char}` : cell.char;
    };

    for (let cellX = 0; cellX < cols; cellX++) {
      const samples: Sample[] = [];
      // Unicode sextant numbering is row-major: 1/2, 3/4, 5/6.
      for (let subY = 0; subY < 3; subY++) {
        for (let subX = 0; subX < 2; subX++) {
          samples.push(imageSample(
            img,
            cellX * 2 + subX,
            cellY * 3 + subY,
            sampleCols,
            sampleRows,
          ));
        }
      }
      put(samples.every(sample => sample.opaque) ? opaqueCell(samples) : transparentCell(samples));
    }
    if (fg !== null) line += FG_RESET;
    if (bg !== null) line += BG_RESET;
    lines.push(line);
  }
  return lines.join('\n');
}

function renderHalfBlocks(
  img: RGBAImage,
  requestedCols: number,
  attempt: (typeof ATTEMPTS)[number],
): string {
  const scale = Math.max(1, img.width / requestedCols, img.height / (MAX_ROWS * 2));
  const targetWidth = Math.max(1, Math.round(img.width / scale));
  const pxRows = Math.max(1, Math.round(img.height / scale));
  const tail = attempt.palette
    ? (sample: Sample) => `5;${to256(sample.r, sample.g, sample.b)}`
    : (sample: Sample) => `2;${sample.r & attempt.mask};${sample.g & attempt.mask};${sample.b & attempt.mask}`;
  const px = (col: number, row: number): string | null => {
    const sample = imageSample(img, col, row, targetWidth, pxRows);
    return sample.opaque ? tail(sample) : null;
  };
  const lines: string[] = [];
  for (let y = 0; y < pxRows; y += 2) {
    let line = '';
    let fg: string | null = null;
    let bg: string | null = null;
    const put = (char: string, wantFg: string | null, wantBg: string | null) => {
      const parts: string[] = [];
      if (wantFg !== null && wantFg !== fg) { parts.push(`38;${wantFg}`); fg = wantFg; }
      if (wantBg !== bg) { parts.push(wantBg === null ? '49' : `48;${wantBg}`); bg = wantBg; }
      line += parts.length ? `\x1b[${parts.join(';')}m${char}` : char;
    };
    for (let x = 0; x < targetWidth; x++) {
      const top = px(x, y);
      const bottom = y + 1 < pxRows ? px(x, y + 1) : null;
      if (top === null && bottom === null) put(' ', null, null);
      else if (top !== null && bottom === null) put('▀', top, null);
      else if (top === null && bottom !== null) put('▄', bottom, null);
      else if (top === bottom) put('█', top, bg);
      else put('▀', top, bottom);
    }
    if (fg !== null) line += FG_RESET;
    if (bg !== null) line += BG_RESET;
    lines.push(line);
  }
  return lines.join('\n');
}

export function imageToAscii(buffer: Buffer, ext: string, maxWidth: number = 80): string | null {
  let img: RGBAImage;
  const normalizedExt = ext.toLowerCase().replace(/^\./, '');
  try {
    if (normalizedExt === 'png') img = PNG.sync.read(buffer);
    else if (normalizedExt === 'jpg' || normalizedExt === 'jpeg') img = jpeg.decode(buffer, { useTArray: true });
    else if (normalizedExt === 'webp') img = decodeWebp(buffer);
    else return null;
  } catch {
    return null;
  }
  if (!img.width || !img.height) return null;

  const requestedMax = Number.isFinite(maxWidth) ? Math.max(1, Math.floor(maxWidth)) : 80;
  const forceHalfBlocks = process.env.CLAUDE_HOOKS_IMAGE_MODE === 'half' || process.env.TERM === 'dumb';
  let out = '';
  const initialCols = forceHalfBlocks
    ? Math.min(img.width, requestedMax)
    : Math.min(Math.ceil(img.width / 2), requestedMax);
  for (let cols = Math.max(1, initialCols); ; ) {
    for (const attempt of ATTEMPTS) {
      out = forceHalfBlocks
        ? renderHalfBlocks(img, cols, attempt)
        : renderSextants(img, cols, attempt);
      if (out.length <= BYTE_BUDGET) return out;
    }
    if (cols <= MIN_COLS) break;
    cols = Math.max(MIN_COLS, Math.floor(cols * 0.85));
  }
  return out;
}
