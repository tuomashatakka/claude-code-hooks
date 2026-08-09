import { describe, expect, test } from 'bun:test';
import {
  BASES,
  glyphTable,
  buildTable,
  coverageFromRects,
  coverageUniform,
  rectsForMask,
  regularSextant,
} from '@tuomashatakka/image-to-ascii';

const GLYPH_TABLE = glyphTable('sextant');

describe('glyph table invariants', () => {
  test('every coverage weight is a fraction', () => {
    for (const g of GLYPH_TABLE.glyphs) {
      expect(g.w.length).toBe(g.basis.size);
      for (const v of g.w) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  test('area, binary and uniform flags agree with the coverage map', () => {
    for (const g of GLYPH_TABLE.glyphs) {
      const sum = [...g.w].reduce((a, b) => a + b, 0);
      expect(g.area).toBeCloseTo(sum / g.w.length, 12);
      expect(g.binary).toBe([...g.w].every(v => v === 0 || v === 1));
      expect(g.uniform).toBe([...g.w].every(v => v === g.w[0]));
    }
  });

  test('solve constants match a direct recomputation', () => {
    for (const g of GLYPH_TABLE.glyphs) {
      const n = g.w.length;
      const a2 = [...g.w].reduce((a, v) => a + v * v, 0) / n;
      const cross = [...g.w].reduce((a, v) => a + v * (1 - v), 0) / n;
      const b2 = [...g.w].reduce((a, v) => a + (1 - v) * (1 - v), 0) / n;
      expect(g.solve.a2).toBeCloseTo(a2, 12);
      expect(g.solve.cross).toBeCloseTo(cross, 12);
      expect(g.solve.b2).toBeCloseTo(b2, 12);
      expect(g.solve.det).toBeCloseTo(a2 * b2 - cross * cross, 12);
      // Binary coverage is what makes the fast solver valid: no cross term.
      if (g.binary) expect(g.solve.cross).toBeCloseTo(0, 12);
      // A uniform glyph reproduces a single colour — the system is singular.
      if (g.uniform) expect(g.solve.det).toBeCloseTo(0, 12);
    }
  });

  test('characters are unique and single code points', () => {
    const seen = new Set<string>();
    for (const g of GLYPH_TABLE.glyphs) {
      expect(seen.has(g.char)).toBe(false);
      seen.add(g.char);
      expect([...g.char].length).toBe(1);
      expect(g.units).toBe(g.char.length as 1 | 2);
    }
    expect(GLYPH_TABLE.chars.size).toBe(GLYPH_TABLE.glyphs.length);
  });

  test('complement is involutive and inverts the coverage', () => {
    const { glyphs, complement } = GLYPH_TABLE;
    let found = 0;
    for (let i = 0; i < glyphs.length; i++) {
      const j = complement[i]!;
      if (j < 0) continue;
      found++;
      expect(complement[j]).toBe(i);
      const a = glyphs[i]!.w;
      const b = glyphs[j]!.w;
      for (let k = 0; k < a.length; k++) expect(b[k]).toBeCloseTo(1 - a[k]!, 12);
    }
    // The sextant family is closed under complement, so most glyphs have one.
    expect(found).toBeGreaterThan(60);
  });

  test('a power-set family keeps every mask, duplicates included', () => {
    // The fitter walks these in Gray-code order, which only works if all 2^n
    // masks are present. Deduplicating ' ' or '█' away would silently demote
    // the family to the slow per-glyph path.
    const sextants = GLYPH_TABLE.glyphs.filter(g => g.family === 'sextant');
    expect(sextants.length).toBe(64);
    expect(sextants.some(g => g.char === ' ')).toBe(true);
    expect(sextants.some(g => g.char === '█')).toBe(true);
  });

  test('later families are deduplicated against earlier ones', () => {
    // '▌' is both sextant mask 21 and the left four-eighths bar.
    expect(GLYPH_TABLE.glyphs.filter(g => g.char === '▌').length).toBe(1);
  });

  test('buildTable ignores families it has no builder for', () => {
    const table = buildTable(['sextant', 'braille']);
    expect(table.families).toEqual(['sextant']);
  });
});

// The rasteriser in tests/helpers/ansi-raster.ts scores renders using the very
// coverage table the renderer chose from, so a wrong coverage map would cancel
// out and score perfectly. These hand-written maps break that circularity for
// the characters that dominate real output.
describe('coverage cross-check against hand-written shapes', () => {
  // Transcribed from the Unicode character names (BLOCK SEXTANT-<positions>),
  // which is an authority independent of the arithmetic in `regularSextant`.
  const HAND: Record<string, number[]> = {
    // 2x3, row-major: [top-left, top-right, mid-left, mid-right, low-left, low-right]
    '█': [1, 1, 1, 1, 1, 1], //  FULL BLOCK
    ' ': [0, 0, 0, 0, 0, 0], //  SPACE
    '▌': [1, 0, 1, 0, 1, 0], //  LEFT HALF BLOCK
    '▐': [0, 1, 0, 1, 0, 1], //  RIGHT HALF BLOCK
    '🬀': [1, 0, 0, 0, 0, 0], //  BLOCK SEXTANT-1
    '🬁': [0, 1, 0, 0, 0, 0], //  BLOCK SEXTANT-2
    '🬂': [1, 1, 0, 0, 0, 0], //  BLOCK SEXTANT-12
    '🬃': [0, 0, 1, 0, 0, 0], //  BLOCK SEXTANT-3
    '🬄': [1, 0, 1, 0, 0, 0], //  BLOCK SEXTANT-13
    '🬏': [0, 0, 0, 0, 1, 0], //  BLOCK SEXTANT-5
    '🬓': [0, 0, 1, 0, 1, 0], //  BLOCK SEXTANT-35
    '🬞': [0, 0, 0, 0, 0, 1], //  BLOCK SEXTANT-6
    '🬦': [0, 0, 0, 1, 0, 1], //  BLOCK SEXTANT-46
    '🬭': [0, 0, 0, 0, 1, 1], //  BLOCK SEXTANT-56
    '🬲': [1, 0, 1, 0, 1, 1], //  BLOCK SEXTANT-1356
    '🬹': [0, 0, 1, 1, 1, 1], //  BLOCK SEXTANT-3456
  };

  // Every mask, in order, taken from the Unicode names rather than from the
  // skip arithmetic. When octants land they get the same treatment — the six
  // out-of-range filler characters are exactly where a silent tofu bug hides.
  const SEXTANT_BY_MASK =
    ' 🬀🬁🬂🬃🬄🬅🬆🬇🬈🬉🬊🬋🬌🬍🬎🬏🬐🬑🬒🬓▌🬔🬕🬖🬗🬘🬙🬚🬛🬜🬝🬞🬟🬠🬡🬢🬣🬤🬥🬦🬧▐🬨🬩🬪🬫🬬🬭🬮🬯🬰🬱🬲🬳🬴🬵🬶🬷🬸🬹🬺🬻█';

  test('regularSextant matches the Unicode name table for all 64 masks', () => {
    const expected = [...SEXTANT_BY_MASK];
    expect(expected.length).toBe(64);
    for (let mask = 0; mask < 64; mask++) {
      expect(regularSextant(mask), `mask ${mask}`).toBe(expected[mask]!);
    }
  });

  test('table coverage matches independently written coverage', () => {
    for (const [char, expected] of Object.entries(HAND)) {
      const glyph = GLYPH_TABLE.glyphs.find(g => g.char === char);
      expect(glyph, `no glyph for ${char}`).toBeDefined();
      const basis = glyph!.basis;
      // Compare on the 2x3 grid the hand map is written on. The 1x1 glyphs
      // (space, full) are constant, so any sampling point is representative.
      for (let i = 0; i < 6; i++) {
        const col = i % 2;
        const row = (i / 2) | 0;
        const gc = Math.min(basis.cols - 1, ((col * basis.cols) / 2) | 0);
        const gr = Math.min(basis.rows - 1, ((row * basis.rows) / 3) | 0);
        expect(glyph!.w[gr * basis.cols + gc], `${char} subcell ${i}`).toBeCloseTo(expected[i]!, 12);
      }
    }
  });

  test('rectsForMask places subcells row-major, matching Unicode numbering', () => {
    const b = BASES['2x3'];
    // BLOCK SEXTANT-1 is the top-left cell only.
    const w = coverageFromRects(b, rectsForMask(b, 0b000001));
    expect([...w]).toEqual([1, 0, 0, 0, 0, 0]);
    expect(regularSextant(0b000001)).toBe('🬀');
    // BLOCK SEXTANT-6 is the bottom-right cell only.
    expect([...coverageFromRects(b, rectsForMask(b, 0b100000))]).toEqual([0, 0, 0, 0, 0, 1]);
  });

  test('uniform coverage is exactly the requested fraction', () => {
    for (const alpha of [0, 0.25, 0.5, 0.75, 1]) {
      const w = coverageUniform(BASES['1x1'], alpha);
      expect([...w]).toEqual([alpha]);
    }
  });
});
