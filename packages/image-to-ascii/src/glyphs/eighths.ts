import { coverageFromRects } from './coverage.ts';
import { BASES, makeGlyph, type Glyph, type Rect } from './types.ts';

// Partial-fill bars at 1/8 precision. They are Unicode 1.1 characters that every
// monospace font has, and they land on exactly the case this renderer sees most:
// a one-pixel rule in a screenshot, which a 2x3 or 2x4 grid can only round to a
// third or a quarter of a cell.

/** Lower N/8, then upper N/8 — U+2581..U+2587 and U+2594 / U+1FB82..U+1FB86. */
const VERTICAL: ReadonlyArray<[eighths: number, fromBottom: boolean, char: string]> = [
  [1, true, '▁'], [2, true, '▂'], [3, true, '▃'], [4, true, '▄'],
  [5, true, '▅'], [6, true, '▆'], [7, true, '▇'],
  [1, false, '▔'], [2, false, '🮂'], [3, false, '🮃'], [4, false, '▀'],
  [5, false, '🮄'], [6, false, '🮅'], [7, false, '🮆'],
];

/** Left N/8 — U+258F..U+2589 — plus the lone right eighth U+2595. */
const HORIZONTAL: ReadonlyArray<[eighths: number, fromLeft: boolean, char: string]> = [
  [1, true, '▏'], [2, true, '▎'], [3, true, '▍'], [4, true, '▌'],
  [5, true, '▋'], [6, true, '▊'], [7, true, '▉'],
  [1, false, '▕'],
];

export function verticalEighthFamily(): Glyph[] {
  const b = BASES['1x8'];
  return VERTICAL.map(([eighths, fromBottom, char]) => {
    const height = eighths / 8;
    const rect: Rect = fromBottom ? [0, 1 - height, 1, 1] : [0, 0, 1, height];
    return makeGlyph(char, 'eighth-v', b, coverageFromRects(b, [rect]));
  });
}

export function horizontalEighthFamily(): Glyph[] {
  const b = BASES['8x1'];
  return HORIZONTAL.map(([eighths, fromLeft, char]) => {
    const width = eighths / 8;
    const rect: Rect = fromLeft ? [0, 0, width, 1] : [1 - width, 0, 1, 1];
    return makeGlyph(char, 'eighth-h', b, coverageFromRects(b, [rect]));
  });
}
