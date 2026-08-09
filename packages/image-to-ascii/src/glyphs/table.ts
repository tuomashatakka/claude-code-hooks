import { horizontalEighthFamily, verticalEighthFamily } from './eighths.ts';
import { octantFamily } from './octants.ts';
import { separatedFamily, sextantFamily } from './sextants.ts';
import { shadeFamily } from './shades.ts';
import type { BasisId, CoverageBasis, Glyph, GlyphFamily, GlyphTable } from './types.ts';

const BUILDERS: Readonly<Partial<Record<GlyphFamily, () => Glyph[]>>> = {
  sextant: sextantFamily,
  octant: octantFamily,
  separated: separatedFamily,
  'eighth-v': verticalEighthFamily,
  'eighth-h': horizontalEighthFamily,
  shade: shadeFamily,
};

/**
 * Families that enumerate every mask on their basis. The fitter scores these in
 * Gray-code order, so a candidate costs three additions instead of a fresh pass
 * over the sub-cells — which is what makes searching 256 octants affordable.
 * They must stay complete: dropping ' ' or '█' as a duplicate would break the
 * power-set structure and quietly demote the family to the slow path.
 */
const POWER_SETS: ReadonlySet<GlyphFamily> = new Set<GlyphFamily>(['sextant', 'octant', 'braille']);

/**
 * Later families are deduplicated against everything already claimed: `▌` and
 * `▀` are reachable from the sextants, the octants and the eighth bars, and a
 * second identical candidate would only cost the search time.
 */
export function buildTable(families: readonly GlyphFamily[]): GlyphTable {
  const glyphs: Glyph[] = [];
  const claimed = new Set<string>();
  const enabled: GlyphFamily[] = [];

  for (const family of families) {
    const build = BUILDERS[family];
    if (!build) continue;
    enabled.push(family);
    const isPowerSet = POWER_SETS.has(family);
    for (const glyph of build()) {
      if (!isPowerSet && claimed.has(glyph.char)) continue;
      claimed.add(glyph.char);
      glyphs.push(glyph);
    }
  }

  const byBasis = new Map<BasisId, number[]>();
  for (let i = 0; i < glyphs.length; i++) {
    const id = glyphs[i]!.basis.id;
    const list = byBasis.get(id);
    if (list) list.push(i);
    else byBasis.set(id, [i]);
  }

  const bases: CoverageBasis[] = [];
  for (const id of byBasis.keys()) {
    const glyph = glyphs.find(g => g.basis.id === id);
    if (glyph) bases.push(glyph.basis);
  }

  return {
    glyphs,
    families: enabled,
    byBasis: new Map([...byBasis].map(([id, list]) => [id, Int32Array.from(list)])),
    bases,
    complement: buildComplements(glyphs),
    chars: claimed,
  };
}

// A glyph and its inverse encode the same two-colour split with fg and bg
// swapped, so the encoder can pick whichever one matches the pen it is already
// holding. Matching on coverage rather than on mask keeps this correct across
// families that share a basis but not a numbering.
function buildComplements(glyphs: readonly Glyph[]): Int32Array {
  const out = new Int32Array(glyphs.length).fill(-1);
  const key = (w: Float64Array) => w.join(',');
  const index = new Map<string, number>();
  for (let i = 0; i < glyphs.length; i++) {
    const id = `${glyphs[i]!.basis.id}|${key(glyphs[i]!.w)}`;
    if (!index.has(id)) index.set(id, i);
  }
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i]!;
    const inverted = Float64Array.from(g.w, v => 1 - v);
    const found = index.get(`${g.basis.id}|${key(inverted)}`);
    if (found !== undefined && found !== i) out[i] = found;
  }
  return out;
}
