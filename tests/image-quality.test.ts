import { describe, expect, test } from 'bun:test';
import { imageToAscii, cellAspect, fitGeometry, BASES } from '@tuomashatakka/image-to-ascii';
import { IMAGE_FIXTURES, fixture } from './helpers/image-fixtures.ts';
import { scoreRender } from './helpers/ansi-raster.ts';
import baseline from './fixtures/image-baseline.json' with { type: 'json' };

// This is the instrument the renderer is tuned against: every change to
// sampling, glyph set or encoding should move these numbers, and the committed
// baseline makes that movement a reviewable one-line diff rather than a claim.
//
// Regenerate with `bun run image:baseline` after a deliberate change.

const RENDER_WIDTH = 86;   // what a hook actually gets: 96 cols minus box chrome
const BUDGET = 9200;
const TOLERANCE = 0.3;     // dB of noise we accept before calling it a regression

type Baseline = Record<string, { psnr: number; chars: number; cols: number; rows: number }>;
const expected = baseline as Baseline;

describe('render quality', () => {
  test('the baseline covers every fixture', () => {
    expect(Object.keys(expected).sort()).toEqual(Object.keys(IMAGE_FIXTURES).sort());
  });

  for (const name of Object.keys(IMAGE_FIXTURES)) {
    test(`${name} holds its quality baseline`, () => {
      const source = fixture(name);
      const ansi = imageToAscii(source, 'png', RENDER_WIDTH);
      expect(ansi).toBeString();

      const score = scoreRender(source, ansi!);
      const want = expected[name]!;

      expect(score.psnr).toBeGreaterThanOrEqual(want.psnr - TOLERANCE);
      expect(score.chars).toBeLessThanOrEqual(BUDGET);
      expect(score.cols).toBeLessThanOrEqual(RENDER_WIDTH);
    });
  }

  test('renders stay within a sane time budget', () => {
    // Generous on purpose: this catches an algorithmic regression, not jitter.
    for (const name of Object.keys(IMAGE_FIXTURES)) {
      const source = fixture(name);
      const started = performance.now();
      imageToAscii(source, 'png', RENDER_WIDTH);
      const elapsed = performance.now() - started;
      expect(elapsed, `${name} took ${elapsed.toFixed(0)}ms`).toBeLessThan(1500);
    }
  });
});

describe('aspect ratio', () => {
  const ASPECT_ENV = 'CLAUDE_HOOKS_IMAGE_CELL_ASPECT';

  function withAspect<T>(value: string | undefined, fn: () => T): T {
    const previous = process.env[ASPECT_ENV];
    if (value === undefined) delete process.env[ASPECT_ENV];
    else process.env[ASPECT_ENV] = value;
    try {
      return fn();
    } finally {
      if (previous === undefined) delete process.env[ASPECT_ENV];
      else process.env[ASPECT_ENV] = previous;
    }
  }

  test('defaults to a 1:2 cell and accepts an override', () => {
    withAspect(undefined, () => expect(cellAspect()).toBe(2));
    withAspect('2.86', () => expect(cellAspect()).toBeCloseTo(2.86, 10));
    withAspect('nonsense', () => expect(cellAspect()).toBe(2));
    withAspect('0', () => expect(cellAspect()).toBe(2));
    withAspect('-1', () => expect(cellAspect()).toBe(2));
  });

  // The rendered block is `cols` cells wide and `rows * aspect` cells tall in
  // units of one cell width. That ratio has to match the source, or the preview
  // is stretched — which is invisible in a character count and obvious on screen.
  const SHAPES: ReadonlyArray<[number, number]> = [
    [300, 100], [100, 300], [400, 400], [1600, 900], [900, 1600], [1200, 1223], [640, 200],
  ];

  for (const aspectValue of ['1.5', '2', '2.86']) {
    test(`preserves source aspect at cell aspect ${aspectValue}`, () => {
      const aspect = Number(aspectValue);
      for (const [w, h] of SHAPES) {
        const { cols, rows } = fitGeometry(w, h, 86, BASES['2x3'], aspect);
        const source = w / h;
        const rendered = cols / (rows * aspect);
        const label = `${w}x${h} at aspect ${aspect} rendered ${cols}x${rows}`;

        // The row count is the only free variable, and it can only land on an
        // integer — so the tight statement is that it is the nearest one.
        const idealRows = (cols * h) / (w * aspect);
        expect(Math.abs(rows - idealRows), `${label}: ideal ${idealRows.toFixed(2)} rows`)
          .toBeLessThanOrEqual(0.5 + 1e-9);

        // Which bounds the visible distortion by half a row's worth of ratio.
        const slack = (source * 0.5) / rows + 1e-9;
        expect(
          Math.abs(rendered - source),
          `${label} -> ${rendered.toFixed(4)} vs source ${source.toFixed(4)}`,
        ).toBeLessThanOrEqual(slack);
      }
    });
  }

  test('a taller cell means fewer rows for the same width', () => {
    const wide = fitGeometry(1200, 1200, 86, BASES['2x3'], 2);
    const tall = fitGeometry(1200, 1200, 86, BASES['2x3'], 2.86);
    expect(tall.cols).toBe(wide.cols);
    expect(tall.rows).toBeLessThan(wide.rows);
  });

  test('never upscales past one cell per sub-column', () => {
    const { cols } = fitGeometry(40, 40, 86, BASES['2x3'], 2);
    expect(cols).toBe(20);
  });
});
