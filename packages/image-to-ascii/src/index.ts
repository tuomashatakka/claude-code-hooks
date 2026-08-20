import { decodeImage, type RGBAImage } from './decode.ts';
import { buildSAT, rectMean, subCellRect, type AreaSample, type ImageSAT } from './sat.ts';
import { costOf, normalizeBudget, type BudgetSpec } from './budget.ts';
import { buildTable } from './glyphs/table.ts';
import {
  compileTable, fitCell, makeCellSamples, makeFitResult, sampleCell,
  type CellSamples, type CompiledTable, type FitResult,
} from './fit.ts';
import { regularSextant, separatedSextant } from './glyphs/sextants.ts';
import { BRAILLE_COLS, brailleChars, renderBraille, type BrailleOptions } from './braille.ts';
import { BASES, type CoverageBasis, type GlyphFamily, type GlyphTable } from './glyphs/types.ts';

export { regularSextant, separatedSextant } from './glyphs/sextants.ts';
export { renderBraille, brailleChars, type BrailleOptions } from './braille.ts';
export { costOf, normalizeBudget, DEFAULT_BUDGET, type BudgetSpec } from './budget.ts';
export { decodeImage, type RGBAImage } from './decode.ts';

const MAX_ROWS = 120;       // downscale bound for very tall images — resizes, never crops
const ALPHA_OPAQUE = 128;   // below this a pixel renders as the terminal's own background
// Quality ladder per width: exact 24-bit first, then coarser truecolor (which
// buys budget by making neighbouring cells repeat a colour and so extend an SGR
// run), then xterm-256 — only then a narrower render.
//
// Coarsening rounds to a ladder of levels that spans the full 0-255 range. The
// obvious implementation, masking off low bits, is a truncation: it can only
// ever move a channel *down*, so every step of degradation also darkens the
// whole image. Rounding costs nothing and avoids that.
const ATTEMPTS: ReadonlyArray<{ levels: number; palette?: false } | { palette: true }> = [
  { levels: 256 }, { levels: 64 }, { levels: 32 }, { palette: true },
];

/** Nearest of `levels` values evenly spanning 0-255 inclusive. */
function quantizeChannel(value: number, levels: number): number {
  if (levels >= 256) return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
  const steps = levels - 1;
  const index = Math.round((value * steps) / 255);
  return Math.round((Math.min(steps, Math.max(0, index)) * 255) / steps);
}
const MIN_COLS = 24;
// Floor and step of the row ladder the budget search falls back on. Below about
// eight rows a photograph has stopped being recognisable, so there is nothing
// left to buy by shrinking further.
const MIN_ROWS = 8;
const ROW_DECAY = 0.7;

/**
 * Which colour tiers the ladder may use. `auto` walks the whole ladder;
 * the explicit modes exist for terminals that only speak one of them, and for
 * measuring what each tier is actually worth.
 */
export type ColorMode = 'auto' | 'truecolor' | 'palette';

/** One rung of the quality ladder: a truecolor level count, or the 256 palette. */
export type Tier = number | 'palette';

export const DEFAULT_TIERS: readonly Tier[] = [256, 64, 32, 'palette'];

function toAttempt(tier: Tier): (typeof ATTEMPTS)[number] {
  return tier === 'palette' ? { palette: true } : { levels: tier };
}

function attemptsFor(mode: ColorMode, tiers: readonly Tier[]): ReadonlyArray<(typeof ATTEMPTS)[number]> {
  const kept = tiers.filter(tier => {
    if (mode === 'truecolor') return tier !== 'palette';
    if (mode === 'palette') return tier === 'palette';
    return true;
  });
  return (kept.length ? kept : tiers).map(toAttempt);
}

function resolveColorMode(requested: ColorMode | undefined): ColorMode {
  const env = process.env.CLAUDE_HOOKS_IMAGE_COLOR;
  if (env === 'truecolor' || env === 'palette' || env === 'auto') return env;
  return requested ?? 'auto';
}

/**
 * Height-to-width ratio of one terminal cell. Everything that maps image
 * geometry onto cells goes through this: get it wrong and the preview is
 * stretched. 2.0 is the usual monospace cell, but a terminal configured with a
 * generous line height is nearer 2.9, so it is overridable.
 *
 * It also decides how many sub-rows a cell should be divided into: sub-samples
 * are square when a 2-wide grid has 2*aspect rows, which makes sextants (3) the
 * right shape near aspect 1.5 and octants (4) the right shape near aspect 2.
 */
export function cellAspect(): number {
  const raw = Number(process.env.CLAUDE_HOOKS_IMAGE_CELL_ASPECT);
  return Number.isFinite(raw) && raw > 0 ? raw : 2;
}

// Nearest xterm-256 index: 24-step grayscale ramp for near-neutral colors (finer than
// the cube's 6 gray levels), 6x6x6 color cube otherwise.
const cubeIdx = (v: number) => (v < 48 ? 0 : v < 115 ? 1 : Math.min(5, Math.round((v - 35) / 40)));
export function to256(r: number, g: number, b: number): number {
  if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && Math.abs(r - b) < 12) {
    if (r < 8) return 16;
    if (r > 238) return 231;
    return 232 + Math.min(23, Math.round((r - 8) / 10));
  }
  return 16 + 36 * cubeIdx(r) + 6 * cubeIdx(g) + cubeIdx(b);
}
const FG_RESET = '\x1b[39m';
const BG_RESET = '\x1b[49m';

/** The colours xterm-256 indices actually resolve to, so the encoder can tell
 *  how far a quantized pen really is from the colour a cell asked for. */
const PALETTE_256: readonly RGB[] = (() => {
  const levels = [0, 95, 135, 175, 215, 255];
  const out: RGB[] = [];
  for (let i = 0; i < 16; i++) {
    const v = i & 8 ? 255 : 128;
    out.push({ r: i & 1 ? v : 0, g: i & 2 ? v : 0, b: i & 4 ? v : 0 });
  }
  for (let i = 16; i < 232; i++) {
    const j = i - 16;
    out.push({ r: levels[(j / 36) | 0]!, g: levels[((j / 6) | 0) % 6]!, b: levels[j % 6]! });
  }
  for (let i = 232; i < 256; i++) {
    const v = 8 + (i - 232) * 10;
    out.push({ r: v, g: v, b: v });
  }
  return out;
})();

/**
 * Which sub-cell grid a cell is divided into.
 *
 * Octants carry a third more vertical detail than sextants for exactly the same
 * one-code-point cost, and on a 1:2 cell their sub-samples are square where a
 * sextant's are a third taller than wide. What they are not is widely
 * supported: they are Unicode 16 (September 2024), and of the fonts in common
 * use only Iosevka derivatives and Cascadia Code >= 2404.23 carry them. A font
 * without them renders tofu, which is far worse than a slightly coarser image.
 *
 * So the default is decided by the terminal, not the font: Ghostty, kitty and
 * WezTerm synthesise every one of these glyphs from the cell metrics and are
 * immune to font coverage entirely. Everywhere else, sextants.
 */
export type GlyphMode = 'sextant' | 'octant' | 'half' | 'braille' | 'ascii';

function environmentGlyphMode(): GlyphMode | null {
  const env = process.env.CLAUDE_HOOKS_IMAGE_MODE;
  return env === 'sextant' || env === 'octant' || env === 'half' || env === 'braille' || env === 'ascii'
    ? env
    : null;
}

function drawsItsOwnGlyphs(): boolean {
  const program = (process.env.TERM_PROGRAM ?? '').toLowerCase();
  if (program === 'ghostty' || program === 'wezterm') return true;
  return Boolean(process.env.KITTY_WINDOW_ID) || process.env.TERM === 'xterm-kitty';
}

export function resolveGlyphMode(): GlyphMode {
  const env = environmentGlyphMode();
  if (env) return env;
  if (process.env.TERM === 'dumb') return 'half';
  // Below a 1.75 cell aspect a 2x3 grid is the squarer of the two, so the
  // octants' extra row would be buying detail in the wrong direction.
  if (drawsItsOwnGlyphs() && cellAspect() >= 1.75) return 'octant';
  return 'sextant';
}

interface MonochromeAnalysis {
  monochrome:      boolean;
  lightBackground: boolean;
}

const MONOCHROME_CHROMA_TOLERANCE = 18;
const MONOCHROME_MIN_SHARE = 0.995;
const MONOCHROME_SAMPLE_LIMIT = 100_000;
const ASCII_RAMP = ' .:-=+*#%@';

/** Low-chroma images take the token-cheap, color-free text renderer. */
function analyzeMonochrome(img: RGBAImage): MonochromeAnalysis {
  const pixels = img.width * img.height;
  const step   = Math.max(1, Math.ceil(pixels / MONOCHROME_SAMPLE_LIMIT));
  let visible  = 0;
  let neutral  = 0;
  let luminance = 0;

  for (let pixel = 0; pixel < pixels; pixel += step) {
    const at = pixel * 4;
    if ((img.data[at + 3] ?? 255) < 16) continue;

    const r = img.data[at] ?? 0;
    const g = img.data[at + 1] ?? 0;
    const b = img.data[at + 2] ?? 0;
    visible++;
    luminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (Math.max(r, g, b) - Math.min(r, g, b) <= MONOCHROME_CHROMA_TOLERANCE)
      neutral++;
  }

  return {
    monochrome:      visible === 0 || neutral / visible >= MONOCHROME_MIN_SHARE,
    lightBackground: visible > 0 && luminance / visible >= 127.5,
  };
}

function renderAsciiLines(
  sat: ImageSAT,
  cols: number,
  rows: number,
  lightBackground: boolean,
): string[] {
  const sample: AreaSample = { r: 0, g: 0, b: 0, a: 0 };
  const lines: string[] = [];

  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const [x0, y0, x1, y1] = subCellRect(sat, x, y, cols, rows);
      rectMean(sat, x0, y0, x1, y1, sample);
      if (sample.a < 16) {
        line += ' ';
        continue;
      }

      const luminance = 0.2126 * sample.r + 0.7152 * sample.g + 0.0722 * sample.b;
      const polarity  = lightBackground ? 255 - luminance : luminance;
      const ink       = polarity * sample.a / 255;
      const index     = Math.min(ASCII_RAMP.length - 1, Math.round(ink / 255 * (ASCII_RAMP.length - 1)));
      line += ASCII_RAMP[index];
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

function widestAsciiRender(
  img: RGBAImage,
  sat: ImageSAT,
  startCols: number,
  spec: BudgetSpec,
  maxRows: number,
  lightBackground: boolean,
): string[] {
  let smallest = [ ' ' ];
  let previousGeometry = '';

  for (let requested = startCols; requested >= 1; requested--) {
    const geometry = fitGeometry(img.width, img.height, requested, BASES['1x1'], cellAspect(), maxRows);
    const key      = `${geometry.cols}x${geometry.rows}`;
    if (key === previousGeometry) continue;
    previousGeometry = key;

    const lines = renderAsciiLines(sat, geometry.cols, geometry.rows, lightBackground);
    smallest = lines;
    if (costOf(lines, spec) <= spec.total)
      return lines;
  }
  return smallest;
}

interface RenderContext {
  table: GlyphTable;
  compiled: CompiledTable;
  complement: ReadonlyMap<string, string>;
  samples: CellSamples;
  fit: FitResult;
  basis: CoverageBasis;
  chars: ReadonlySet<string>;
}

const CONTEXTS = new Map<string, RenderContext>();

/**
 * Shades only earn their place when the codec cannot name the colour a cell
 * wants: they are rank deficient, reproducing exactly what a full block does,
 * so in truecolor they are strictly more expensive for identical output.
 */
function contextFor(mode: GlyphMode, palette: boolean): RenderContext {
  const key = `${mode}|${palette ? 'shade' : 'plain'}`;
  const cached = CONTEXTS.get(key);
  if (cached) return cached;

  const primary: GlyphFamily = mode === 'octant' ? 'octant' : 'sextant';
  const families: GlyphFamily[] = [primary, 'separated', 'eighth-v', 'eighth-h'];
  if (palette) families.push('shade');

  const table = buildTable(families);
  const complement = new Map<string, string>();
  for (let i = 0; i < table.glyphs.length; i++) {
    const j = table.complement[i]!;
    if (j >= 0) complement.set(table.glyphs[i]!.char, table.glyphs[j]!.char);
  }
  const compiled = compileTable(table);
  const context: RenderContext = {
    table,
    compiled,
    complement,
    samples: makeCellSamples(compiled),
    fit: makeFitResult(),
    basis: mode === 'octant' ? BASES['2x4'] : BASES['2x3'],
    chars: table.chars,
  };
  CONTEXTS.set(key, context);
  return context;
}

/** The candidate set a mode searches — exposed so tests can rasterise a render
 *  back to pixels without re-deriving each character's shape. */
export function glyphTable(mode: GlyphMode = resolveGlyphMode(), palette = false): GlyphTable {
  return contextFor(mode === 'octant' ? 'octant' : 'sextant', palette).table;
}

/** Every character this package can emit in the current mode. */
export function glyphChars(mode: GlyphMode = resolveGlyphMode()): ReadonlySet<string> {
  if (mode === 'braille') return brailleChars();
  if (mode === 'half') return new Set([' ', '\u2580', '\u2584', '\u2588']);
  const chars = new Set(contextFor(mode, false).chars);
  for (const char of contextFor(mode, true).chars) chars.add(char);
  return chars;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface Sample extends RGB {
  opaque: boolean;
}

/**
 * "Leave the pen where it is." Under a full block the background is invisible
 * and under a space the foreground is, so demanding a particular colour for the
 * hidden channel buys nothing and costs an escape sequence — which, at roughly
 * four fifths of the output, is the budget this renderer is actually short of.
 */
const KEEP = Symbol('keep');
type Slot = RGB | null | typeof KEEP;

interface Cell {
  char: string;
  fg: Slot;
  bg: Slot;
  /** Ink fraction of the glyph — weights how much a colour error actually shows. */
  area: number;
}

function dist2(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/**
 * How much error we will accept to avoid emitting an escape, in squared RGB
 * units weighted by the area the colour actually covers. Perturbing a cell's
 * optimum costs `area * |dfg|^2 + (1 - area) * |dbg|^2`, so the same raw colour
 * shift matters far less on a one-sixth sliver than on a full block — a flat
 * threshold over-snaps thin glyphs and under-snaps solid ones.
 */
const SNAP_TOLERANCE = 160;

/**
 * How much better than a flat cell a two-colour glyph has to be before it earns
 * the second pen colour it costs. Swept against the fixtures: 0 leaves the fit
 * cost-blind and half the cells become eighth-bars (a barcode, 27.88 dB); 200
 * is the peak at 28.54 dB with 8% bars and three quarters of cells flat; past
 * ~1500 it starts flattening away real detail. Overridable for re-calibration.
 */
const FIT_MARGIN = 200;

function fitMargin(): number {
  const raw = Number(process.env.CLAUDE_HOOKS_IMAGE_FIT_MARGIN);
  return Number.isFinite(raw) && raw >= 0 ? raw : FIT_MARGIN;
}

/**
 * Sub-cell opacity decides which path a cell takes. Fully opaque cells go
 * through the least-squares fit; fully transparent ones are a space; mixed ones
 * take their shape from the alpha mask instead of from a fit, so a logo's edge
 * stays where the artwork put it.
 */
const enum Opacity { Opaque, Clear, Mixed }

function classify(alpha: Float64Array): Opacity {
  let opaque = 0;
  for (let i = 0; i < alpha.length; i++) if (alpha[i]! >= ALPHA_OPAQUE) opaque++;
  if (opaque === alpha.length) return Opacity.Opaque;
  return opaque === 0 ? Opacity.Clear : Opacity.Mixed;
}

function rgbAt(plane: Float64Array, index: number): RGB {
  const at = index * 3;
  return { r: plane[at]!, g: plane[at + 1]!, b: plane[at + 2]! };
}

function transparentCell(alpha: Float64Array, plane: Float64Array): Cell {
  let mask = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < alpha.length; i++) {
    if (alpha[i]! < ALPHA_OPAQUE) continue;
    mask |= 1 << i;
    const at = i * 3;
    r += plane[at]!; g += plane[at + 1]!; b += plane[at + 2]!;
    count++;
  }
  if (!count) return { char: ' ', fg: KEEP, bg: null, area: 0 };
  return {
    // Separated cells keep the terminal background visible between isolated
    // transparent-edge samples.
    char: separatedSextant(mask) ?? regularSextant(mask),
    fg: { r: r / count, g: g / count, b: b / count },
    bg: null,
    area: count / alpha.length,
  };
}

function fittedCell(fit: FitResult): Cell {
  const glyph = fit.glyph;
  const fg: RGB = { r: fit.fg[0]!, g: fit.fg[1]!, b: fit.fg[2]! };
  if (glyph === null || glyph.area >= 1) return { char: '\u2588', fg, bg: KEEP, area: 1 };
  const bg: RGB = { r: fit.bg[0]!, g: fit.bg[1]!, b: fit.bg[2]! };
  if (glyph.area <= 0) return { char: ' ', fg: KEEP, bg, area: 0 };
  return { char: glyph.char, fg, bg, area: glyph.area };
}

/**
 * Cell grid for an image, preserving its aspect: the rendered block is
 * `cols` wide and `rows * cellAspect()` tall in units of one cell width, and
 * that ratio has to match the source. `cols` never exceeds one cell per
 * sub-column of source pixels, so a small image is never upscaled.
 */
export function fitGeometry(
  width: number,
  height: number,
  requestedCols: number,
  basis: CoverageBasis = BASES['2x3'],
  aspect: number = cellAspect(),
  maxRows: number = MAX_ROWS,
): { cols: number; rows: number } {
  let cols = Math.max(1, Math.min(requestedCols, Math.ceil(width / basis.cols)));
  let rows = Math.max(1, Math.round((height * cols) / (width * aspect)));
  if (rows > maxRows) {
    cols = Math.max(1, Math.floor((cols * maxRows) / rows));
    rows = Math.max(1, Math.min(maxRows, Math.round((height * cols) / (width * aspect))));
  }
  return { cols, rows };
}

const scratch: AreaSample = { r: 0, g: 0, b: 0, a: 0 };

/**
 * The mean colour of the source over one sub-cell. Averaging the whole region
 * rather than poking a single pixel is the difference between a preview and a
 * field of aliasing noise — and it pays for itself twice, because a smooth
 * render also holds longer SGR runs and so fits more cells in the budget.
 */
function imageSample(
  sat: ImageSAT,
  sampleX: number,
  sampleY: number,
  sampleCols: number,
  sampleRows: number,
): Sample {
  const [x0, y0, x1, y1] = subCellRect(sat, sampleX, sampleY, sampleCols, sampleRows);
  rectMean(sat, x0, y0, x1, y1, scratch);
  return {
    r: Math.round(scratch.r),
    g: Math.round(scratch.g),
    b: Math.round(scratch.b),
    opaque: scratch.a >= ALPHA_OPAQUE,
  };
}

interface Pen {
  fgTail: string | null;
  bgTail: string | null;
  /** What the pen currently *displays*, after quantization — not what was asked for. */
  fgColor: RGB | null;
  bgColor: RGB | null;
}

interface Quantized {
  tail: string;
  color: RGB;
}

type Quantizer = (color: RGB) => Quantized;

function quantizer(attempt: (typeof ATTEMPTS)[number]): Quantizer {
  if (attempt.palette) {
    return color => {
      const index = to256(color.r, color.g, color.b);
      return { tail: `5;${index}`, color: PALETTE_256[index]! };
    };
  }
  const levels = attempt.levels;
  return color => {
    const r = quantizeChannel(color.r, levels);
    const g = quantizeChannel(color.g, levels);
    const b = quantizeChannel(color.b, levels);
    return { tail: `2;${r};${g};${b}`, color: { r, g, b } };
  };
}

/**
 * Resolve one colour slot against the pen. `KEEP` never moves the pen; a real
 * colour close enough to what the pen already shows reuses it rather than
 * paying for an escape.
 */
function resolveSlot(
  slot: Slot,
  penTail: string | null,
  penColor: RGB | null,
  weight: number,
  quantize: Quantizer,
): { tail: string | null; color: RGB | null } {
  if (slot === KEEP) return { tail: penTail, color: penColor };
  if (slot === null) return { tail: null, color: null };
  if (penTail !== null && penColor !== null && weight * dist2(slot, penColor) <= SNAP_TOLERANCE) {
    return { tail: penTail, color: penColor };
  }
  const q = quantize(slot);
  return { tail: q.tail, color: q.color };
}

function escapeCount(fgTail: string | null, bgTail: string | null, pen: Pen): number {
  return (fgTail !== null && fgTail !== pen.fgTail ? 1 : 0) + (bgTail !== pen.bgTail ? 1 : 0);
}

function emitCell(cell: Cell, pen: Pen, quantize: Quantizer, complement: ReadonlyMap<string, string>): string {
  let char = cell.char;
  let fg = resolveSlot(cell.fg, pen.fgTail, pen.fgColor, cell.area, quantize);
  let bg = resolveSlot(cell.bg, pen.bgTail, pen.bgColor, 1 - cell.area, quantize);

  // Swapping only preserves the picture when both halves are real colours: with
  // a transparent background the two orientations paint different things.
  const swapped = complement.get(cell.char);
  if (swapped !== undefined && typeof cell.fg === 'object' && cell.fg !== null
      && typeof cell.bg === 'object' && cell.bg !== null) {
    const altFg = resolveSlot(cell.bg, pen.fgTail, pen.fgColor, 1 - cell.area, quantize);
    const altBg = resolveSlot(cell.fg, pen.bgTail, pen.bgColor, cell.area, quantize);
    if (escapeCount(altFg.tail, altBg.tail, pen) < escapeCount(fg.tail, bg.tail, pen)) {
      char = swapped;
      fg = altFg;
      bg = altBg;
    }
  }

  const parts: string[] = [];
  if (fg.tail !== null && fg.tail !== pen.fgTail) {
    parts.push(`38;${fg.tail}`);
    pen.fgTail = fg.tail;
    pen.fgColor = fg.color;
  }
  if (bg.tail !== pen.bgTail) {
    parts.push(bg.tail === null ? '49' : `48;${bg.tail}`);
    pen.bgTail = bg.tail;
    pen.bgColor = bg.color;
  }
  return parts.length ? `\x1b[${parts.join(';')}m${char}` : char;
}

/**
 * A render together with how much of the image it explains.
 *
 * The fitter maximises `G = 2*INT t.c - INT|c|^2` per cell, and total error is
 * `INT|t|^2 - sum(G)`. That first term is the same number whatever grid the
 * image is cut into, so **the sum of G is directly comparable between renders
 * of different widths** — which is what makes it possible to choose a width by
 * quality rather than by assuming wider is better. It is not: cost swings by
 * over 20% between adjacent widths depending on whether the cell grid lands on
 * the image's own edges, and so does fidelity.
 */
interface Render {
  lines: string[];
  score: number;
}

function renderFitted(
  img: RGBAImage,
  sat: ImageSAT,
  requestedCols: number,
  attempt: (typeof ATTEMPTS)[number],
  ctx: RenderContext,
  maxRows: number = MAX_ROWS,
): Render {
  const { cols, rows } = fitGeometry(img.width, img.height, requestedCols, ctx.basis, cellAspect(), maxRows);
  const quantize = quantizer(attempt);
  const alphaPlane = ctx.samples.planes.get('2x3')!;
  const lines: string[] = [];
  let score = 0;

  for (let cellY = 0; cellY < rows; cellY++) {
    const pen: Pen = { fgTail: null, bgTail: null, fgColor: null, bgColor: null };
    let line = '';
    for (let cellX = 0; cellX < cols; cellX++) {
      sampleCell(sat, ctx.compiled, cellX, cellY, cols, rows, ctx.samples);
      let cell: Cell;
      switch (classify(ctx.samples.alpha)) {
        case Opacity.Clear:
          cell = { char: ' ', fg: KEEP, bg: null, area: 0 };
          break;
        case Opacity.Mixed:
          cell = transparentCell(ctx.samples.alpha, alphaPlane);
          break;
        default:
          cell = fittedCell(fitCell(ctx.compiled, ctx.samples, ctx.fit, fitMargin()));
          score += ctx.fit.score;
      }
      line += emitCell(cell, pen, quantize, ctx.complement);
    }
    if (pen.fgTail !== null) line += FG_RESET;
    if (pen.bgTail !== null) line += BG_RESET;
    lines.push(line);
  }
  return { lines, score };
}

function renderHalfBlocks(
  img: RGBAImage,
  sat: ImageSAT,
  requestedCols: number,
  attempt: (typeof ATTEMPTS)[number],
  maxRows: number = MAX_ROWS,
): Render {
  // Half blocks pack two image rows into one cell and one image column into one
  // cell — a 1x2 basis rather than the sextants' 2x3. The pixel-row count is
  // deliberately not forced even: an image with an odd number of rows leaves the
  // final cell's lower half unpainted rather than inventing a row for it.
  const aspect = cellAspect();
  const scale = Math.max(1, img.width / requestedCols, (img.height * 2) / (aspect * maxRows * 2));
  const targetWidth = Math.max(1, Math.round(img.width / scale));
  const pxRows = Math.max(1, Math.round((img.height * 2) / (scale * aspect)));
  const quantize = quantizer(attempt);
  const tail = (sample: Sample) => quantize(sample).tail;
  const px = (col: number, row: number): string | null => {
    const sample = imageSample(sat, col, row, targetWidth, pxRows);
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
  return { lines, score: 0 };
}

/**
 * Best-scoring render that fits the budget.
 *
 * The obvious search — widen until it stops fitting — is wrong here, because
 * neither cost nor fidelity is monotonic in the width. Whether the cell grid
 * happens to land on the image's own edges swings the character count by more
 * than 20% between adjacent widths, and the widest render that fits is
 * routinely a couple of dB worse than one a few columns narrower. So this scans
 * a spread of widths and keeps the one that explains the most of the image.
 */
function bestFittingRender(
  startCols: number,
  spec: BudgetSpec,
  render: (cols: number) => Render,
): Render | null {
  // Renders are cheap enough (a few milliseconds) to look at consecutive widths
  // rather than a spread: the oscillation has a period of two to four columns,
  // so a coarse scan walks straight past the good ones.
  const WINDOW = 16;

  // A tall, narrow source arrives here already below MIN_COLS — its width is
  // bounded by its own pixels, not by the caller's request. Flooring the search
  // at MIN_COLS would then skip every rung and hand back the one render that
  // was already too big, so the floor follows the image down.
  const floor = Math.max(1, Math.min(MIN_COLS, startCols));

  let best: Render | null = null;
  let bestScore = -Infinity;

  const consider = (cols: number): boolean => {
    const attempt = render(cols);
    if (costOf(attempt.lines, spec) > spec.total) return false;
    if (attempt.score > bestScore) {
      best = attempt;
      bestScore = attempt.score;
    }
    return true;
  };

  // The widest render is the common case and usually the best one; take it
  // without paying for a search when it already fits.
  if (consider(startCols)) return best;

  for (let cols = startCols - 1; cols >= floor && cols > startCols - 1 - WINDOW; cols--) consider(cols);
  if (best) return best;

  for (let cols = Math.max(floor, startCols - WINDOW); cols >= floor; ) {
    if (consider(cols)) return best;
    if (cols === floor) break;
    cols = Math.max(floor, Math.floor(cols * 0.85));
  }
  return best;
}

export interface RenderOptions {
  maxWidth?: number;
  /**
   * Rows the render may occupy. Narrowing cannot shrink a tall, narrow image —
   * its width is already pinned by its own pixels — so this is the axis a
   * caller with a byte budget has to be able to squeeze.
   */
  maxRows?: number;
  budget?: number | BudgetSpec;
  colorMode?: ColorMode;
  /** Quality rungs to try at each width, richest first. */
  tiers?: readonly Tier[];
  /**
   * Sub-cell grid to render on, overriding what the terminal suggests. A caller
   * that knows what it is drawing — line art, say — can pick better than the
   * environment can.
   */
  mode?: GlyphMode;
  /** Options for `mode: 'braille'`. */
  braille?: BrailleOptions;
}

export function imageToMonochromeAscii(buffer: Buffer, ext: string, maxWidth?: number): string | null;
export function imageToMonochromeAscii(buffer: Buffer, ext: string, options: RenderOptions): string | null;
export function imageToMonochromeAscii(
  buffer: Buffer,
  ext: string,
  widthOrOptions: number | RenderOptions = 80,
): string | null {
  const options: RenderOptions = typeof widthOrOptions === 'number'
    ? { maxWidth: widthOrOptions }
    : widthOrOptions;
  const img = decodeImage(buffer, ext);
  if (!img) return null;

  const maxWidth = options.maxWidth ?? 80;
  const requestedMax = Number.isFinite(maxWidth) ? Math.max(1, Math.floor(maxWidth)) : 80;
  const requestedRows = Math.max(1, Math.floor(options.maxRows ?? MAX_ROWS));
  const analysis = analyzeMonochrome(img);
  const lines = widestAsciiRender(
    img,
    buildSAT(img),
    Math.min(img.width, requestedMax),
    normalizeBudget(options.budget),
    requestedRows,
    analysis.lightBackground,
  );
  const output = lines.join('\n');
  return output.length > 0 ? output : ' ';
}

/**
 * Widest braille render that fits.
 *
 * Braille costs three bytes per non-empty cell and nothing else — no escapes,
 * so no run-length luck — which makes its cost monotone in the width and the
 * search a bisection rather than the fitted path's scan over a window of widths.
 */
function widestBrailleRender(
  img: RGBAImage,
  sat: ImageSAT,
  startCols: number,
  spec: BudgetSpec,
  options: BrailleOptions | undefined,
  maxRows: number = MAX_ROWS,
): string[] {
  const at = (cols: number): string[] => {
    const geometry = fitGeometry(img.width, img.height, cols, BASES['2x4'], cellAspect(), maxRows);
    return renderBraille(sat, geometry.cols, geometry.rows, options ?? {});
  };
  let low = 1;
  let high = Math.max(1, startCols);
  let best = at(low);
  while (low <= high) {
    const cols = (low + high) >> 1;
    const lines = at(cols);
    if (costOf(lines, spec) <= spec.total) {
      best = lines;
      low = cols + 1;
    } else {
      high = cols - 1;
    }
  }
  return best;
}

export function imageToAscii(buffer: Buffer, ext: string, maxWidth?: number): string | null;
export function imageToAscii(buffer: Buffer, ext: string, options: RenderOptions): string | null;
export function imageToAscii(
  buffer: Buffer,
  ext: string,
  widthOrOptions: number | RenderOptions = 80,
): string | null {
  const options: RenderOptions = typeof widthOrOptions === 'number'
    ? { maxWidth: widthOrOptions }
    : widthOrOptions;
  const img = decodeImage(buffer, ext);
  if (!img) return null;

  const sat = buildSAT(img);
  const spec = normalizeBudget(options.budget);
  const maxWidth = options.maxWidth ?? 80;
  const requestedMax = Number.isFinite(maxWidth) ? Math.max(1, Math.floor(maxWidth)) : 80;
  const mode = options.mode ?? resolveGlyphMode();
  const forceHalfBlocks = mode === 'half';
  const initialCols = forceHalfBlocks
    ? Math.min(img.width, requestedMax)
    : Math.min(Math.ceil(img.width / BRAILLE_COLS), requestedMax);

  const requestedRows = Math.max(1, Math.floor(options.maxRows ?? MAX_ROWS));

  if (mode === 'ascii') {
    return imageToMonochromeAscii(buffer, ext, options);
  }

  if (mode === 'braille') {
    return widestBrailleRender(img, sat, initialCols, spec, options.braille, requestedRows).join('\n');
  }

  const attempts = attemptsFor(resolveColorMode(options.colorMode), options.tiers ?? DEFAULT_TIERS);

  // Every render is weighed on the way past, so whatever the search ends up
  // rejecting still leaves the cheapest thing it saw behind. Handing back an
  // over-budget render is what puts a hole in the middle of a picture: the
  // caller's transport cuts it rather than the renderer shrinking it.
  let out: string[] = [];
  let cheapest = Infinity;
  let lastRows = requestedRows;

  const render = (cols: number, attempt: (typeof ATTEMPTS)[number], maxRows: number): Render => {
    const result = forceHalfBlocks
      ? renderHalfBlocks(img, sat, cols, attempt, maxRows)
      : renderFitted(img, sat, cols, attempt, contextFor(mode, Boolean(attempt.palette)), maxRows);
    const cost = costOf(result.lines, spec);
    lastRows = result.lines.length;
    if (cost < cheapest) {
      cheapest = cost;
      out = result.lines;
    }
    return result;
  };

  // Quality is the outer loop and width the inner one, which is the opposite of
  // what it used to be. Trying every colour tier at a given width means taking
  // the first rung that fits — and a degraded-colour render at a slightly wider
  // grid consistently loses to an exact-colour render a few columns narrower.
  // Measured across the fixtures, narrowing at full colour beats degrading
  // colour to stay wide by ~1.9 dB. The cheaper tiers are still reachable, but
  // only once even MIN_COLS cannot fit at a richer one.
  //
  // Around all of that sits the row cap, because width alone is not a search.
  // A 40x4000 source is two columns wide however much room it is offered, and
  // its cost is carried entirely by its hundred rows: every rung of the width
  // ladder renders the identical grid at the identical price. Shrinking the cap
  // to a fraction of what the last render actually produced is what moves it,
  // and it resizes rather than crops — the whole picture survives, smaller.
  for (let rows = requestedRows; rows >= MIN_ROWS; rows = Math.floor(lastRows * ROW_DECAY)) {
    for (const attempt of attempts) {
      const fitted = bestFittingRender(Math.max(1, initialCols), spec, cols => render(cols, attempt, rows));
      if (fitted) return fitted.lines.join('\n');
    }
    if (lastRows <= MIN_ROWS) break;
  }
  return out.join('\n');
}

/**
 * The glyph table the fitted renderer searches. Exposed so tests can rasterise
 * a render back to pixels without re-deriving each character's shape.
 */
export { buildTable } from './glyphs/table.ts';
export { BASES, type Glyph, type GlyphTable, type GlyphFamily, type CoverageBasis } from './glyphs/types.ts';
export { coverageFromRects, coverageUniform, coverageFromShape, rectsForMask } from './glyphs/coverage.ts';
