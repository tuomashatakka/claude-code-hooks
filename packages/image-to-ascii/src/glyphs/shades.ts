import { coverageUniform } from './coverage.ts';
import { BASES, makeGlyph, type Glyph } from './types.ts';

/**
 * The shade characters mix foreground and background at a fixed ratio, so a
 * cell can display a colour that is *between* two the codec can name.
 *
 * That is worth nothing in truecolor — a uniform-coverage glyph is rank
 * deficient, reproducing exactly the single colour a full block already
 * reproduces, at the cost of setting both pen colours instead of one. It is
 * worth a great deal in xterm-256, where the 6x6x6 cube steps 40 units per
 * channel and blending two neighbouring entries halves the quantisation error.
 * The fitter only offers these when the active codec cannot hit colours exactly.
 */
const SHADES: ReadonlyArray<[alpha: number, char: string]> = [
  [0.25, '░'], [0.5, '▒'], [0.75, '▓'],
];

export function shadeFamily(): Glyph[] {
  const b = BASES['1x1'];
  return SHADES.map(([alpha, char]) => makeGlyph(char, 'shade', b, coverageUniform(b, alpha)));
}
