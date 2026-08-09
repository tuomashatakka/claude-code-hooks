// The renderer scores every candidate glyph through one model: a glyph is
// fractional ink coverage w over the cell, and the cell displays
// w*fg + (1-w)*bg. Sextants and octants have w in {0,1}; the shade characters
// have a constant fractional w; wedges have fractional w only at their edges.
// One scoring loop covers all of them.

export type GlyphFamily =
  | 'space'
  | 'full'
  | 'half'
  | 'quadrant'
  | 'sextant'
  | 'separated'
  | 'octant'
  | 'shade'
  | 'eighth-v'
  | 'eighth-h'
  | 'diagonal'
  | 'braille';

/** Axis-aligned rect in unit-cell coordinates: (0,0) top-left, (1,1) bottom-right. */
export type Rect = readonly [x0: number, y0: number, x1: number, y1: number];

export type BasisId = '1x1' | '1x2' | '2x2' | '2x3' | '2x4' | '1x8' | '8x1' | '4x6';

/**
 * The quadrature a family needs. `cols x rows` subcell means of the cell are a
 * sufficient statistic for every glyph declared on this basis: each glyph's
 * coverage is constant within every subcell, so the score integral is exact.
 *
 * Families deliberately do NOT share one supersampling grid. A shared 4x8 or
 * 8x8 grid would make sextants inexact (3 does not divide 8) and would multiply
 * the resampling cost several times over for no accuracy gain. Scores computed
 * on different bases stay comparable because each is an exact integral of the
 * same error over the same cell.
 */
export interface CoverageBasis {
  readonly id: BasisId;
  readonly cols: number;
  readonly rows: number;
  readonly size: number;
}

export function basis(id: BasisId, cols: number, rows: number): CoverageBasis {
  return { id, cols, rows, size: cols * rows };
}

export const BASES: Readonly<Record<BasisId, CoverageBasis>> = {
  '1x1': basis('1x1', 1, 1),
  '1x2': basis('1x2', 1, 2),
  '2x2': basis('2x2', 2, 2),
  '2x3': basis('2x3', 2, 3),
  '2x4': basis('2x4', 2, 4),
  '1x8': basis('1x8', 1, 8),
  '8x1': basis('8x1', 8, 1),
  '4x6': basis('4x6', 4, 6),
};

/**
 * Entries of the 2x2 normal-equation system that solves for the optimal
 * (fg, bg) pair, precomputed per glyph. See `solveColors`.
 */
export interface SolveConstants {
  /** mean(w^2) */
  readonly a2: number;
  /** mean(w(1-w)) — zero for binary glyphs, which is what makes them cheap. */
  readonly cross: number;
  /** mean((1-w)^2) */
  readonly b2: number;
  /** a2*b2 - cross^2. Zero for uniform-coverage glyphs (rank deficient). */
  readonly det: number;
}

export interface Glyph {
  readonly char: string;
  /** char.length — astral glyphs cost 2 toward the display budget, BMP ones 1. */
  readonly units: 1 | 2;
  readonly family: GlyphFamily;
  readonly basis: CoverageBasis;
  /** Ink fraction per basis subcell, length = basis.size, each in [0,1]. */
  readonly w: Float64Array;
  /** Cell-area ink fraction, mean(w). */
  readonly area: number;
  /** Every w is 0 or 1 — enables the decoupled fast solver. */
  readonly binary: boolean;
  /** Every w is equal — the solver is singular and the glyph reproduces one colour. */
  readonly uniform: boolean;
  /** The mask this glyph came from, for power-set families; -1 otherwise. */
  readonly mask: number;
  readonly solve: SolveConstants;
}

export interface GlyphTable {
  readonly glyphs: readonly Glyph[];
  readonly families: readonly GlyphFamily[];
  /** Indices of every glyph declared on a given basis. */
  readonly byBasis: ReadonlyMap<BasisId, Int32Array>;
  /** Only the bases some enabled family actually needs. */
  readonly bases: readonly CoverageBasis[];
  /** Index of the fg/bg-swapped glyph, or -1 when the table has no such glyph. */
  readonly complement: Int32Array;
  readonly chars: ReadonlySet<string>;
}

export function solveConstants(w: Float64Array): SolveConstants {
  let a2 = 0;
  let cross = 0;
  let b2 = 0;
  for (let i = 0; i < w.length; i++) {
    const v = w[i]!;
    a2 += v * v;
    cross += v * (1 - v);
    b2 += (1 - v) * (1 - v);
  }
  a2 /= w.length;
  cross /= w.length;
  b2 /= w.length;
  return { a2, cross, b2, det: a2 * b2 - cross * cross };
}

export function makeGlyph(
  char: string,
  family: GlyphFamily,
  coverageBasis: CoverageBasis,
  w: Float64Array,
  mask = -1,
): Glyph {
  let area = 0;
  let binary = true;
  let uniform = true;
  const first = w[0]!;
  for (let i = 0; i < w.length; i++) {
    const v = w[i]!;
    area += v;
    if (v !== 0 && v !== 1) binary = false;
    if (v !== first) uniform = false;
  }
  return {
    char,
    units: char.length === 2 ? 2 : 1,
    family,
    basis: coverageBasis,
    w,
    area: area / w.length,
    binary,
    uniform,
    mask,
    solve: solveConstants(w),
  };
}
