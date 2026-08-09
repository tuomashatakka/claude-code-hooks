import type { CoverageBasis, Rect } from './types.ts';

/**
 * Union of axis-aligned rects -> per-subcell ink fraction. Exact for the block
 * families, whose rects are disjoint by construction; the clamp is a guard
 * against a malformed generator rather than an expected code path.
 */
export function coverageFromRects(basis: CoverageBasis, rects: readonly Rect[]): Float64Array {
  const w = new Float64Array(basis.size);
  const cellW = 1 / basis.cols;
  const cellH = 1 / basis.rows;
  const subArea = cellW * cellH;
  for (let row = 0; row < basis.rows; row++) {
    for (let col = 0; col < basis.cols; col++) {
      const sx0 = col * cellW;
      const sy0 = row * cellH;
      const sx1 = sx0 + cellW;
      const sy1 = sy0 + cellH;
      let covered = 0;
      for (const [x0, y0, x1, y1] of rects) {
        const ox = Math.min(sx1, x1) - Math.max(sx0, x0);
        const oy = Math.min(sy1, y1) - Math.max(sy0, y0);
        if (ox > 0 && oy > 0) covered += ox * oy;
      }
      w[row * basis.cols + col] = Math.min(1, covered / subArea);
    }
  }
  return w;
}

/** Constant coverage: space, full block, and the shade characters. */
export function coverageUniform(basis: CoverageBasis, alpha: number): Float64Array {
  return new Float64Array(basis.size).fill(alpha);
}

/**
 * Coverage for shapes that are not unions of rects — wedges and braille dots.
 * Supersamples each subcell; run once at module load, never in the cell loop.
 */
export function coverageFromShape(
  basis: CoverageBasis,
  inside: (x: number, y: number) => boolean,
  samples = 8,
): Float64Array {
  const w = new Float64Array(basis.size);
  const cellW = 1 / basis.cols;
  const cellH = 1 / basis.rows;
  const step = 1 / samples;
  for (let row = 0; row < basis.rows; row++) {
    for (let col = 0; col < basis.cols; col++) {
      let hits = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (col + (sx + 0.5) * step) * cellW;
          const y = (row + (sy + 0.5) * step) * cellH;
          if (inside(x, y)) hits++;
        }
      }
      w[row * basis.cols + col] = hits / (samples * samples);
    }
  }
  return w;
}

/**
 * Rects covering the subcells selected by `mask`, for a power-set family on
 * `basis`. Bit i selects subcell i in row-major order, which is the numbering
 * Unicode uses for both BLOCK SEXTANT-* and BLOCK OCTANT-*.
 */
export function rectsForMask(basis: CoverageBasis, mask: number): Rect[] {
  const rects: Rect[] = [];
  const cellW = 1 / basis.cols;
  const cellH = 1 / basis.rows;
  for (let i = 0; i < basis.size; i++) {
    if (!(mask & (1 << i))) continue;
    const col = i % basis.cols;
    const row = (i / basis.cols) | 0;
    rects.push([col * cellW, row * cellH, (col + 1) * cellW, (row + 1) * cellH]);
  }
  return rects;
}
