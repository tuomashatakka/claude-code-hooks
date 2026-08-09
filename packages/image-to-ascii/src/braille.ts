import { rectMean, subCellRect, type AreaSample, type ImageSAT } from './sat.ts';

/**
 * Braille is the odd one out among the block families and earns its own path.
 *
 * Every other glyph here splits a cell into two colours and pays an SGR
 * sequence — often two — for the privilege; at four fifths of the output, that
 * is what the byte budget actually buys. Braille spends nothing on colour: one
 * cell is 2x4 independent dots in the terminal's own foreground, so a row costs
 * three bytes per cell and nothing else. For line art that is the better trade
 * by a wide margin — eight dots of *shape* per cell beats six of shape plus two
 * colours, when the source has no colour worth keeping.
 *
 * The dot numbering is the historical one, not raster order: dots 1-3 run down
 * the left column, 4-6 down the right, and 7-8 are the fourth row added when
 * braille went from six dots to eight.
 */
const DOT_BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
] as const;

export const BRAILLE_BASE = 0x2800;

/** Sub-cell grid one braille cell resolves. */
export const BRAILLE_COLS = 2;
export const BRAILLE_ROWS = 4;

/**
 * A dot is set when the source under it is darker than this fraction of the way
 * from background to full ink. Half is the neutral choice and the one that
 * keeps a stroke the width the artwork drew it.
 */
const THRESHOLD = 0.5;

export interface BrailleOptions {
  /**
   * Spread the thresholding error into the neighbouring dots. On flat artwork
   * this is nearly invisible; on anything with a gradient it is the difference
   * between a shape and a silhouette.
   */
  dither?: boolean;
  threshold?: number;
}

const scratch: AreaSample = { r: 0, g: 0, b: 0, a: 0 };

/**
 * How much ink is under one dot, 0 (background) to 1 (solid). Transparent
 * counts as background, and what remains is measured as darkness — the sources
 * this mode is for are dark strokes on a light or empty ground.
 */
function inkAt(sat: ImageSAT, x: number, y: number, cols: number, rows: number): number {
  const [x0, y0, x1, y1] = subCellRect(sat, x, y, cols, rows);
  rectMean(sat, x0, y0, x1, y1, scratch);
  const luma = (0.299 * scratch.r + 0.587 * scratch.g + 0.114 * scratch.b) / 255;
  return (scratch.a / 255) * (1 - Math.min(1, Math.max(0, luma)));
}

/**
 * `cols` x `rows` braille cells covering the whole image.
 *
 * Empty cells are emitted as a plain space rather than U+2800. The two are
 * indistinguishable on screen — no colour is ever set, so there is no
 * background to reveal — and the space costs a third of the bytes.
 */
export function renderBraille(
  sat: ImageSAT,
  cols: number,
  rows: number,
  options: BrailleOptions = {},
): string[] {
  const threshold = options.threshold ?? THRESHOLD;
  const dotCols = cols * BRAILLE_COLS;
  const dotRows = rows * BRAILLE_ROWS;

  const ink = new Float64Array(dotCols * dotRows);
  for (let y = 0; y < dotRows; y++) {
    for (let x = 0; x < dotCols; x++) ink[y * dotCols + x] = inkAt(sat, x, y, dotCols, dotRows);
  }

  const on = new Uint8Array(dotCols * dotRows);
  for (let y = 0; y < dotRows; y++) {
    for (let x = 0; x < dotCols; x++) {
      const at = y * dotCols + x;
      const value = ink[at]!;
      const lit = value >= threshold ? 1 : 0;
      on[at] = lit;
      if (options.dither === false) continue;
      // Floyd-Steinberg, clipped at the edges rather than wrapped: a wrapped
      // error walks a bright artefact down the opposite margin.
      const error = value - lit;
      const spread = (index: number, weight: number) => { ink[index] = ink[index]! + error * weight; };
      if (x + 1 < dotCols) spread(at + 1, 7 / 16);
      if (y + 1 < dotRows) {
        if (x > 0) spread(at + dotCols - 1, 3 / 16);
        spread(at + dotCols, 5 / 16);
        if (x + 1 < dotCols) spread(at + dotCols + 1, 1 / 16);
      }
    }
  }

  const lines: string[] = [];
  for (let cellY = 0; cellY < rows; cellY++) {
    let line = '';
    for (let cellX = 0; cellX < cols; cellX++) {
      let mask = 0;
      for (let dy = 0; dy < BRAILLE_ROWS; dy++) {
        const row = (cellY * BRAILLE_ROWS + dy) * dotCols;
        for (let dx = 0; dx < BRAILLE_COLS; dx++) {
          if (on[row + cellX * BRAILLE_COLS + dx]) mask |= DOT_BITS[dy]![dx]!;
        }
      }
      line += mask === 0 ? ' ' : String.fromCharCode(BRAILLE_BASE + mask);
    }
    // Trailing blanks paint nothing and cost bytes the picture could spend.
    lines.push(line.replace(/ +$/, ''));
  }
  return lines;
}

/** Every character this mode can emit. */
export function brailleChars(): Set<string> {
  const chars = new Set<string>([' ']);
  for (let mask = 1; mask < 256; mask++) chars.add(String.fromCharCode(BRAILLE_BASE + mask));
  return chars;
}
