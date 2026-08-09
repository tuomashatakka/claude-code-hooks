import { coverageFromRects, rectsForMask } from './coverage.ts';
import { BASES, makeGlyph, type Glyph } from './types.ts';

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

/** All 64 regular sextant masks, indexed by mask. */
export function sextantFamily(): Glyph[] {
  const b = BASES['2x3'];
  const out: Glyph[] = [];
  for (let mask = 0; mask < 64; mask++) {
    out.push(makeGlyph(regularSextant(mask), 'sextant', b, coverageFromRects(b, rectsForMask(b, mask)), mask));
  }
  return out;
}

// Separated sextants inset each filled subcell so the terminal background stays
// visible between isolated samples. They exist only for the alpha path, where a
// glyph's shape is dictated by the opacity mask rather than chosen by fit.
const SEPARATED_INSET = 0.15;

export function separatedFamily(): Glyph[] {
  const b = BASES['2x3'];
  const out: Glyph[] = [];
  for (let mask = 1; mask <= LAST_SEPARATED_MASK; mask++) {
    const char = separatedSextant(mask);
    if (char === null) continue;
    const rects = rectsForMask(b, mask).map(([x0, y0, x1, y1]) => {
      const ix = (x1 - x0) * SEPARATED_INSET;
      const iy = (y1 - y0) * SEPARATED_INSET;
      return [x0 + ix, y0 + iy, x1 - ix, y1 - iy] as const;
    });
    out.push(makeGlyph(char, 'separated', b, coverageFromRects(b, rects), mask));
  }
  return out;
}
