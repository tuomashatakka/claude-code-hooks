import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import { previewBudgetBytes, renderFileResult, stripLineRange } from '../src/render/file-preview.ts';
import { stripAnsi } from '../src/render/primitives.ts';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-result-'));
const target = path.join(dir, 'sample.ts');
fs.writeFileSync(target, ['const a = 1;', 'const b = 2;', 'const c = 3;', 'const d = 4;'].join('\n'));

describe('stripLineRange', () => {
  test('splits a wcgw line range off the path', () => {
    expect(stripLineRange('/x/y.ts:10-40')).toEqual({ path: '/x/y.ts', range: { start: 10, end: 40 } });
    expect(stripLineRange('/x/y.ts:10-')).toEqual({ path: '/x/y.ts', range: { start: 10, end: null } });
    expect(stripLineRange('/x/y.ts')).toEqual({ path: '/x/y.ts', range: null });
  });
});

describe('renderFileResult', () => {
  test('titles the box with the path and seats the action in its bottom edge', () => {
    const rendered = renderFileResult(target, { action: 'write' })!;
    const lines = rendered.split('\n');
    const out = stripAnsi(rendered);
    const title = stripAnsi(lines[1]!);
    // Last line is the trailing blank renderCard always emits; the bottom edge
    // is the one before it (or before the shadow the file card casts).
    const bottom = stripAnsi(lines.filter(l => stripAnsi(l).includes('▔')).at(-1)!);

    expect(out).toContain('const a = 1;');
    expect(out).toContain('const d = 4;');
    expect(title).toContain(target);
    expect(title).not.toContain('write');
    expect(bottom).toContain('write');
    expect(bottom.trimEnd()).toMatch(/write\s*░?$/);
  });

  test('prefers the file on disk over fallback response text', () => {
    const out = stripAnsi(renderFileResult(target, { fallbackText: 'fallback only' })!);
    expect(out).toContain('const a = 1;');
    expect(out).not.toContain('fallback only');
  });

  test('slices to the requested line range', () => {
    const out = stripAnsi(renderFileResult(`${target}:2-3`, { action: 'read' })!);
    expect(out).toContain('const b = 2;');
    expect(out).toContain('const c = 3;');
    expect(out).not.toContain('const a = 1;');
    expect(out).toContain('lines 2-3');
  });

  test('returns null for an unreadable path', () => {
    expect(renderFileResult(path.join(dir, 'missing.ts'))).toBeNull();
  });

  test('an explicit range overrides the path suffix', () => {
    const out = stripAnsi(renderFileResult(`${target}:1-2`, { range: { start: 4, end: 4 } })!);
    expect(out).toContain('const d = 4;');
    expect(out).not.toContain('const a = 1;');
  });

  // The transport's answer to an oversized message is to cut its middle out, so
  // a card that overruns its budget reaches the terminal as a picture with a
  // hole in it. Every shape has to come in under it — the tall, narrow one that
  // no width the renderer could pick would ever shrink most of all.
  test.each([
    ['tall',   40,  4_000],
    ['wide',   4_000,  40],
    ['square', 900,   900],
  ])('sizes a %s image to the card budget', (_shape, width, height) => {
    const image = path.join(dir, `${_shape}.png`);
    const png = new PNG({ width, height });
    for (let i = 0; i < width * height; i++) {
      const at = i << 2;
      png.data[at] = (i * 31) % 256;
      png.data[at + 1] = (i * 7) % 256;
      png.data[at + 2] = (i * 19) % 256;
      png.data[at + 3] = 255;
    }
    fs.writeFileSync(image, PNG.sync.write(png));

    const card = renderFileResult(image, { action: 'read' })!;
    expect(Buffer.byteLength(JSON.stringify(card), 'utf8')).toBeLessThanOrEqual(previewBudgetBytes());
    // A card that fits by giving up on the picture is not a fit worth having.
    expect(stripAnsi(card)).not.toContain('image preview omitted');
  }, 20_000);

  test('transform reshapes the raw text before highlighting', () => {
    const out = stripAnsi(renderFileResult(target, { transform: raw => raw.split('\n')[0]! })!);
    expect(out).toContain('const a = 1;');
    expect(out).not.toContain('const b = 2;');
  });
});
