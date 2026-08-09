import { PNG } from 'pngjs';

// Fixtures are generated rather than committed as binaries: the repo already
// builds its demo images this way (scripts/fixtures.ts), the tests stay
// hermetic, and a reviewer can see exactly what is being measured. Everything
// here is deterministic — no Math.random — so baselines are reproducible.

/** xorshift32: deterministic, and good enough for texture. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 0x100000000;
  };
}

interface Painter {
  (x: number, y: number): [r: number, g: number, b: number, a: number];
}

function build(width: number, height: number, paint: Painter): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (width * y + x) << 2;
      const [r, g, b, a] = paint(x, y);
      png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = a;
    }
  }
  return PNG.sync.write(png);
}

/** Flat panels, 1px rules, and text-sized blocks — the axis-aligned case. */
function uiScreenshot(): Buffer {
  const w = 960, h = 640;
  return build(w, h, (x, y) => {
    if (x === 240 || x === 241 || y === 48 || y === 49) return [90, 96, 110, 255];  // 2px chrome rules
    if (x === 700) return [60, 64, 76, 255];                                        // 1px hairline
    if (x < 240) return y % 64 < 28 && x > 24 && x < 210 ? [72, 78, 92, 255] : [34, 36, 44, 255];
    if (y < 48) return [28, 30, 38, 255];
    // "text" rows: short runs of light pixels on a light panel
    const row = ((y - 60) / 22) | 0;
    const inText = (y - 60) % 22 < 11 && x > 280 && x < 280 + ((row * 137) % 520);
    return inText ? [206, 210, 220, 255] : [245, 246, 250, 255];
  });
}

/** Dark background, sparse bright marks — where banding shows worst. */
function darkTerminal(): Buffer {
  const w = 800, h = 500;
  const r = rng(0x51ce);
  const marks: number[] = [];
  for (let i = 0; i < 4000; i++) marks.push((r() * w * h) | 0);
  const set = new Set(marks);
  return build(w, h, (x, y) => {
    if (set.has(y * w + x)) return [120, 230, 160, 255];
    const glow = Math.max(0, 40 - Math.hypot(x - 620, y - 120) / 6);
    return [18 + glow, 18 + glow * 0.6, 24 + glow * 0.4, 255];
  });
}

/** Smooth gradients plus diagonals and a curve — the non-axis-aligned case. */
function chart(): Buffer {
  const w = 720, h = 480;
  return build(w, h, (x, y) => {
    const bg: [number, number, number] = [250 - (y / h) * 40, 250 - (y / h) * 30, 252, ];
    const curve = h - 80 - Math.sin((x / w) * Math.PI * 1.6) * 150 - (x / w) * 120;
    if (Math.abs(y - curve) < 2.5) return [230, 90, 110, 255];
    if (Math.abs(y - (h - (x * h) / w)) < 2) return [70, 130, 230, 255];      // 45-degree line
    if (Math.abs(y - (h - (x * h) / (w * 3))) < 2) return [40, 180, 140, 255]; // shallow diagonal
    return [bg[0] | 0, bg[1] | 0, bg[2] | 0, 255];
  });
}

/** Continuous tone: value noise at several octaves, no hard edges. */
function photo(): Buffer {
  const w = 600, h = 400;
  const r = rng(0xf0f0);
  const grid: number[][] = [];
  for (let o = 0; o < 4; o++) {
    const n = 4 << o;
    const plane: number[] = [];
    for (let i = 0; i < n * n * 3; i++) plane.push(r());
    grid.push(plane);
  }
  // Smoothly interpolated, not nearest-neighbour: sampling the lattice directly
  // would make this a mosaic of hard-edged blocks, and any render whose grid
  // happened to align with that lattice would score several dB better than its
  // neighbours. A benchmark has to be phase-neutral to mean anything.
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const at = (o: number, ch: number, gx: number, gy: number) => {
    const n = 4 << o;
    return grid[o]![((gy % n) * n + (gx % n)) * 3 + ch]!;
  };
  const sample = (o: number, ch: number, u: number, v: number) => {
    const n = 4 << o;
    const fx = u * n;
    const fy = v * n;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = smooth(fx - x0);
    const ty = smooth(fy - y0);
    const top = at(o, ch, x0, y0) * (1 - tx) + at(o, ch, x0 + 1, y0) * tx;
    const bottom = at(o, ch, x0, y0 + 1) * (1 - tx) + at(o, ch, x0 + 1, y0 + 1) * tx;
    return top * (1 - ty) + bottom * ty;
  };
  return build(w, h, (x, y) => {
    const u = x / w, v = y / h;
    const ch = (c: number) => {
      let acc = 0, amp = 0.6;
      for (let o = 0; o < 4; o++) { acc += sample(o, c, u, v) * amp; amp *= 0.5; }
      return Math.max(0, Math.min(255, (acc * 190) | 0));
    };
    return [ch(0), ch(1), ch(2), 255];
  });
}

/** Hard alpha edges — exercises the separated-sextant path. */
function alphaLogo(): Buffer {
  const w = 320, h = 320;
  return build(w, h, (x, y) => {
    const dx = x - 160, dy = y - 160;
    const d = Math.hypot(dx, dy);
    if (d > 140) return [0, 0, 0, 0];
    if (d > 96) return [250, 120, 40, 255];
    if (Math.abs(dx) < 26 || Math.abs(dy) < 26) return [40, 40, 60, 255];
    return [0, 0, 0, 0];
  });
}

export const IMAGE_FIXTURES: Readonly<Record<string, () => Buffer>> = {
  'ui-screenshot': uiScreenshot,
  'dark-terminal': darkTerminal,
  chart,
  photo,
  'alpha-logo': alphaLogo,
};

export type FixtureName = keyof typeof IMAGE_FIXTURES;

const cache = new Map<string, Buffer>();

export function fixture(name: string): Buffer {
  const hit = cache.get(name);
  if (hit) return hit;
  const make = IMAGE_FIXTURES[name];
  if (!make) throw new Error(`unknown image fixture: ${name}`);
  const buf = make();
  cache.set(name, buf);
  return buf;
}
