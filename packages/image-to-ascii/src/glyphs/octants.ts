import { coverageFromRects, rectsForMask } from './coverage.ts';
import { OCTANT_CHARS } from './octant-table.ts';
import { BASES, makeGlyph, type Glyph } from './types.ts';

export { OCTANT_CHARS, OCTANT_OUT_OF_RANGE } from './octant-table.ts';

export function octantChar(mask: number): string {
  return OCTANT_CHARS[mask & 0xff]!;
}

/**
 * All 256 2x4 masks. Octants cost exactly what sextants cost — one code point
 * per cell — but carry a third more vertical detail, and on the usual 1:2
 * terminal cell their sub-samples come out square where a sextant's are a third
 * taller than they are wide.
 */
export function octantFamily(): Glyph[] {
  const b = BASES['2x4'];
  const out: Glyph[] = [];
  for (let mask = 0; mask < 256; mask++) {
    out.push(makeGlyph(octantChar(mask), 'octant', b, coverageFromRects(b, rectsForMask(b, mask)), mask));
  }
  return out;
}
