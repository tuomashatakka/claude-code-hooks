#!/usr/bin/env bun
// Procedurally generated image fixtures, shared by scripts/smoke.ts (which
// asserts the Read hook renders ANSI block/sextant pixels instead of "[Image Data]")
// and scripts/capture-demo.ts (which needs the same rendering for the
// showcase page). Generated rather than committed so the repo carries no
// binary blobs and both consumers stay byte-identical.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';

const TMP = os.tmpdir();

export const SMOKE_PNG = path.join(TMP, 'claude-hooks-smoke.png');
export const SMOKE_JPG = path.join(TMP, 'claude-hooks-smoke.jpg');
export const DEMO_PNG = path.join(TMP, 'claude-hooks-demo.png');

/** Flat RGBA buffer from a per-pixel color function. */
function paint(
  width: number,
  height: number,
  color: (x: number, y: number) => [number, number, number]
): Buffer {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (width * y + x) * 4;
      const [r, g, b] = color(x, y);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return data;
}

function writePng(file: string, width: number, height: number, data: Buffer): void {
  const png = new PNG({ width, height });
  data.copy(png.data);
  fs.writeFileSync(file, PNG.sync.write(png));
}

// The original 8x8 smoke gradient — small on purpose, the assertion only cares
// that block characters come out the other side.
const smokeGradient = (x: number, y: number): [number, number, number] => [x * 32, y * 32, 128];

/**
 * A hexagonal sigil for the showcase page's "Read an image" beat.
 *
 * Deliberately flat-colored: image-to-ascii walks a quality ladder that
 * quantizes channels and then falls back to xterm-256 once a render would
 * exceed the hook's byte budget. Gradients band into horizontal stripes under
 * that pressure, so this uses four solid colors and thick edges - long RLE
 * runs, and shapes that survive whichever rung the ladder lands on.
 */
const SIGIL_BG: [number, number, number] = [18, 18, 24];
const SIGIL_RING: [number, number, number] = [75, 196, 196]; // --cyan
const SIGIL_CORE: [number, number, number] = [194, 100, 214]; // --magenta
const SIGIL_EDGE: [number, number, number] = [217, 119, 87]; // --clay

function demoSigil(width: number, height: number) {
  return (x: number, y: number): [number, number, number] => {
    const nx = (x / (width - 1)) * 2 - 1;
    const ny = (y / (height - 1)) * 2 - 1;
    const d = Math.max(Math.abs(nx) * 0.8660254 + Math.abs(ny) * 0.5, Math.abs(ny)) * 1.08;
    // scanline slot through the middle, like the ASCII sigil fixture
    const slot = Math.abs(ny) < 0.07 && Math.abs(nx) > 0.24;
    if (slot) return SIGIL_BG;
    if (d > 0.97) return SIGIL_BG;
    if (d > 0.82) return SIGIL_EDGE;
    if (d > 0.62) return SIGIL_BG;
    if (d > 0.44) return SIGIL_RING;
    if (d > 0.26) return SIGIL_BG;
    return SIGIL_CORE;
  };
}

/** Writes every image fixture and returns their paths. */
export function writeImageFixtures(): { png: string; jpg: string; demo: string } {
  writePng(SMOKE_PNG, 8, 8, paint(8, 8, smokeGradient));

  const jpegBuffer = jpeg.encode({ data: paint(8, 8, smokeGradient), width: 8, height: 8 }, 50).data;
  fs.writeFileSync(SMOKE_JPG, jpegBuffer);

  const dw = 60;
  const dh = 44;
  writePng(DEMO_PNG, dw, dh, paint(dw, dh, demoSigil(dw, dh)));

  return { png: SMOKE_PNG, jpg: SMOKE_JPG, demo: DEMO_PNG };
}

export function removeImageFixtures(): void {
  for (const f of [SMOKE_PNG, SMOKE_JPG, DEMO_PNG]) {
    try {
      fs.unlinkSync(f);
    } catch {
      // already gone — nothing to clean up
    }
  }
}
