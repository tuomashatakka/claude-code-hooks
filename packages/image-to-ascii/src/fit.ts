import { rectMean, type AreaSample, type ImageSAT } from './sat.ts';
import { BASES, type BasisId, type CoverageBasis, type Glyph, type GlyphTable } from './glyphs/types.ts';

/**
 * Choosing a glyph is a least-squares problem: given the source colour over a
 * cell, pick the character whose ink pattern, filled with one foreground and
 * one background colour, comes closest.
 *
 * Write the displayed colour as `c(p) = w(p)*fg + (1-w(p))*bg`. Then
 *
 *   E = INT |t - c|^2 = INT|t|^2  -  ( 2*INT t.c - INT|c|^2 )
 *                       ^^^^^^^^     ^^^^^^^^^^^^^^^^^^^^^^^
 *                       same for       call this G
 *                       every glyph
 *
 * so minimising the error is maximising G — and because the dropped term does
 * not depend on the glyph, **G is comparable across glyphs declared on
 * different sub-cell grids**. That is what lets a 2x3 sextant, a 1x8 bar and a
 * 2x4 octant compete in one search without resampling everything onto a shared
 * grid: each family only needs the sub-cell means its own shape is constant on,
 * and each of those is an exact integral of the same underlying cell.
 */

/** Sub-cell means for one cell, one entry per basis the search needs. */
export interface CellSamples {
  /** Per basis: `size * 3` channel means, row-major. */
  planes: Map<BasisId, Float64Array>;
  /** Mean colour of the whole cell. */
  mean: Float64Array;
  /** Per-sub-cell alpha on the 2x3 grid, for the transparency path. */
  alpha: Float64Array;
  /** Mean alpha over the cell. */
  meanAlpha: number;
}

export interface FitResult {
  /** Null when nothing beat a flat cell — the caller draws a full block. */
  glyph: Glyph | null;
  fg: Float64Array;
  bg: Float64Array;
  /** Explained energy — higher is better. Comparable across bases. */
  score: number;
}

/**
 * A power-set family compiled for incremental scoring: every mask on the basis
 * is a candidate, so successive masks in Gray-code order differ by one sub-cell
 * and the running sum updates with three adds instead of a fresh pass.
 */
interface PowerSet {
  basis: CoverageBasis;
  /** Characters indexed by mask. */
  chars: readonly string[];
  glyphs: readonly Glyph[];
  /** Gray-code walk: which bit flips at each step, and whether it turns on. */
  flipBit: Int32Array;
  flipOn: Uint8Array;
  order: Int32Array;
}

/** Glyphs with no power-set structure: bars, wedges, shades. */
interface Shaped {
  glyph: Glyph;
  /** Indices of sub-cells with non-zero ink, and their weights. */
  index: Int32Array;
  weight: Float64Array;
}

export interface CompiledTable {
  powerSets: readonly PowerSet[];
  shaped: readonly Shaped[];
  bases: readonly CoverageBasis[];
  /** Uniform-coverage glyphs reproduce a single colour and are only ever worth
   *  trying when the colour codec cannot hit that colour exactly. */
  uniformShaped: readonly Shaped[];
}

function grayOrder(bits: number): { order: Int32Array; flipBit: Int32Array; flipOn: Uint8Array } {
  const count = 1 << bits;
  const order = new Int32Array(count);
  const flipBit = new Int32Array(count);
  const flipOn = new Uint8Array(count);
  for (let i = 0; i < count; i++) order[i] = i ^ (i >> 1);
  for (let i = 1; i < count; i++) {
    const changed = order[i]! ^ order[i - 1]!;
    flipBit[i] = Math.log2(changed) | 0;
    flipOn[i] = (order[i]! & changed) !== 0 ? 1 : 0;
  }
  return { order, flipBit, flipOn };
}

export function compileTable(table: GlyphTable): CompiledTable {
  const powerSets: PowerSet[] = [];
  const shaped: Shaped[] = [];
  const uniformShaped: Shaped[] = [];
  const bases = new Map<BasisId, CoverageBasis>();

  const byFamilyBasis = new Map<string, Glyph[]>();
  for (const glyph of table.glyphs) {
    const key = `${glyph.family}|${glyph.basis.id}`;
    const list = byFamilyBasis.get(key);
    if (list) list.push(glyph);
    else byFamilyBasis.set(key, [glyph]);
  }

  for (const [key, glyphs] of byFamilyBasis) {
    const basis = glyphs[0]!.basis;
    // Separated sextants are shape-dictated, not fitted: their inset squares
    // exist to let the terminal background show through a transparent edge. A
    // fit would happily pick one for an opaque cell, drawing gaps that are not
    // in the image.
    if (glyphs[0]!.family === 'separated') continue;
    const complete = glyphs.length === 1 << basis.size && glyphs.every(g => g.mask >= 0 && g.binary);
    if (complete) {
      const chars: string[] = new Array(glyphs.length);
      const ordered: Glyph[] = new Array(glyphs.length);
      for (const g of glyphs) { chars[g.mask] = g.char; ordered[g.mask] = g; }
      const walk = grayOrder(basis.size);
      powerSets.push({ basis, chars, glyphs: ordered, ...walk });
      bases.set(basis.id, basis);
      continue;
    }
    for (const glyph of glyphs) {
      const index: number[] = [];
      const weight: number[] = [];
      for (let i = 0; i < glyph.w.length; i++) {
        if (glyph.w[i]! > 0) { index.push(i); weight.push(glyph.w[i]!); }
      }
      const entry: Shaped = { glyph, index: Int32Array.from(index), weight: Float64Array.from(weight) };
      if (glyph.uniform) uniformShaped.push(entry);
      else shaped.push(entry);
      bases.set(basis.id, basis);
    }
    void key;
  }

  // Always sampled: '1x1' is the cell mean every candidate scores against, and
  // '2x3' carries the per-sub-cell alpha the transparency path shapes itself on
  // (there is no separated-octant series to switch to).
  bases.set('1x1', BASES['1x1']);
  bases.set('2x3', BASES['2x3']);
  return { powerSets, shaped, uniformShaped, bases: [...bases.values()] };
}

const rectScratch: AreaSample = { r: 0, g: 0, b: 0, a: 0 };

export function makeCellSamples(compiled: CompiledTable): CellSamples {
  const planes = new Map<BasisId, Float64Array>();
  for (const basis of compiled.bases) planes.set(basis.id, new Float64Array(basis.size * 3));
  return {
    planes,
    mean: new Float64Array(3),
    alpha: new Float64Array(BASES['2x3'].size),
    meanAlpha: 0,
  };
}

/** Fill every basis's sub-cell means for the cell at (cellX, cellY). */
export function sampleCell(
  sat: ImageSAT,
  compiled: CompiledTable,
  cellX: number,
  cellY: number,
  cols: number,
  rows: number,
  out: CellSamples,
): void {
  const cellW = sat.width / cols;
  const cellH = sat.height / rows;
  const left = cellX * cellW;
  const top = cellY * cellH;

  for (const basis of compiled.bases) {
    const plane = out.planes.get(basis.id)!;
    const needsAlpha = basis.id === '2x3';
    const subW = cellW / basis.cols;
    const subH = cellH / basis.rows;
    for (let row = 0; row < basis.rows; row++) {
      for (let col = 0; col < basis.cols; col++) {
        const x0 = left + col * subW;
        const y0 = top + row * subH;
        rectMean(sat, x0, y0, x0 + subW, y0 + subH, rectScratch, needsAlpha);
        const at = (row * basis.cols + col) * 3;
        plane[at] = rectScratch.r;
        plane[at + 1] = rectScratch.g;
        plane[at + 2] = rectScratch.b;
        if (basis.id === '2x3') out.alpha[row * basis.cols + col] = rectScratch.a;
      }
    }
  }

  rectMean(sat, left, top, left + cellW, top + cellH, rectScratch);
  out.mean[0] = rectScratch.r;
  out.mean[1] = rectScratch.g;
  out.mean[2] = rectScratch.b;
  out.meanAlpha = rectScratch.a;
}

const CLAMP_LO = 0;
const CLAMP_HI = 255;
const clamp = (v: number) => (v < CLAMP_LO ? CLAMP_LO : v > CLAMP_HI ? CLAMP_HI : v);

/**
 * Score a candidate given the running sum `P = sum over selected sub-cells`.
 * For binary coverage the normal equations decouple, so the optimum is just the
 * mean of each side and the score falls out in a handful of operations.
 */
function scoreBinary(px: number, py: number, pz: number, mx: number, my: number, mz: number, a: number, n: number): number {
  const P = 1 / n;
  const p0 = px * P;
  const p1 = py * P;
  const p2 = pz * P;
  if (a <= 0 || a >= 1) return mx * mx + my * my + mz * mz;
  const q0 = mx - p0;
  const q1 = my - p1;
  const q2 = mz - p2;
  const ia = 1 / a;
  const ib = 1 / (1 - a);
  return (p0 * p0 + p1 * p1 + p2 * p2) * ia + (q0 * q0 + q1 * q1 + q2 * q2) * ib;
}

/**
 * Margin, in explained-energy units, that a two-colour candidate must beat a
 * flat cell by before it is worth drawing.
 *
 * Without it the fit is cost-blind: a nearly flat cell picks `▇` over `█`
 * because a one-eighth sliver of background explains a hair more variance — and
 * pays a second SGR colour for it. Since roughly four fifths of the output is
 * escape sequences, that trade is almost always bad, and it makes the render
 * look like a barcode rather than a picture.
 */
export function fitCell(
  compiled: CompiledTable,
  samples: CellSamples,
  out: FitResult,
  margin = 0,
): FitResult {
  const mx = samples.mean[0]!;
  const my = samples.mean[1]!;
  const mz = samples.mean[2]!;

  // The flat cell is the baseline every other candidate has to beat — by
  // `margin`, which prices the extra pen colour a two-colour glyph needs.
  const flatScore = mx * mx + my * my + mz * mz;
  let bestScore = flatScore + margin;
  let bestGlyph: Glyph | null = null;
  let bestFg: [number, number, number] = [mx, my, mz];
  let bestBg: [number, number, number] = [mx, my, mz];

  for (const family of compiled.powerSets) {
    const plane = samples.planes.get(family.basis.id)!;
    const n = family.basis.size;
    let px = 0;
    let py = 0;
    let pz = 0;
    for (let step = 1; step < family.order.length; step++) {
      const bit = family.flipBit[step]!;
      const sign = family.flipOn[step]! ? 1 : -1;
      const at = bit * 3;
      px += sign * plane[at]!;
      py += sign * plane[at + 1]!;
      pz += sign * plane[at + 2]!;

      const mask = family.order[step]!;
      const glyph = family.glyphs[mask]!;
      const a = glyph.area;
      const score = scoreBinary(px, py, pz, mx, my, mz, a, n);
      if (score > bestScore) {
        bestScore = score;
        bestGlyph = glyph;
        const inv = 1 / n;
        const p0 = px * inv;
        const p1 = py * inv;
        const p2 = pz * inv;
        if (a <= 0 || a >= 1) {
          bestFg = [mx, my, mz];
          bestBg = [mx, my, mz];
        } else {
          const ia = 1 / a;
          const ib = 1 / (1 - a);
          bestFg = [p0 * ia, p1 * ia, p2 * ia];
          bestBg = [(mx - p0) * ib, (my - p1) * ib, (mz - p2) * ib];
        }
      }
    }
  }

  for (const entry of compiled.shaped) {
    const glyph = entry.glyph;
    const plane = samples.planes.get(glyph.basis.id)!;
    const n = glyph.basis.size;
    let px = 0;
    let py = 0;
    let pz = 0;
    for (let i = 0; i < entry.index.length; i++) {
      const at = entry.index[i]! * 3;
      const w = entry.weight[i]!;
      px += w * plane[at]!;
      py += w * plane[at + 1]!;
      pz += w * plane[at + 2]!;
    }
    const inv = 1 / n;
    const p0 = px * inv;
    const p1 = py * inv;
    const p2 = pz * inv;
    const q0 = mx - p0;
    const q1 = my - p1;
    const q2 = mz - p2;

    const { a2, cross, b2, det } = glyph.solve;
    if (Math.abs(det) < 1e-12) continue;
    const f0 = clamp((b2 * p0 - cross * q0) / det);
    const f1 = clamp((b2 * p1 - cross * q1) / det);
    const f2 = clamp((b2 * p2 - cross * q2) / det);
    const g0 = clamp((a2 * q0 - cross * p0) / det);
    const g1 = clamp((a2 * q1 - cross * p1) / det);
    const g2 = clamp((a2 * q2 - cross * p2) / det);

    // Recomputed from the clamped colours so an out-of-gamut solve cannot
    // report a score it is unable to actually draw.
    const dot = f0 * p0 + f1 * p1 + f2 * p2 + g0 * q0 + g1 * q1 + g2 * q2;
    const energy =
      a2 * (f0 * f0 + f1 * f1 + f2 * f2) +
      2 * cross * (f0 * g0 + f1 * g1 + f2 * g2) +
      b2 * (g0 * g0 + g1 * g1 + g2 * g2);
    const score = 2 * dot - energy;
    if (score > bestScore) {
      bestScore = score;
      bestGlyph = glyph;
      bestFg = [f0, f1, f2];
      bestBg = [g0, g1, g2];
    }
  }

  out.glyph = bestGlyph;
  out.fg[0] = bestFg[0]; out.fg[1] = bestFg[1]; out.fg[2] = bestFg[2];
  out.bg[0] = bestBg[0]; out.bg[1] = bestBg[1]; out.bg[2] = bestBg[2];
  out.score = bestGlyph === null ? flatScore : bestScore - margin;
  return out;
}

export function makeFitResult(): FitResult {
  return { glyph: null, fg: new Float64Array(3), bg: new Float64Array(3), score: 0 };
}
