import { describe, expect, test } from 'bun:test';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import { imageToAscii } from '../src/render/image-to-ascii.ts';

const ANSI_RE = /\x1b\[[0-9;]*m/g;
const BLOCK_RE = /[\u2580\u2584\u2588]/;

function pngBuffer(width: number, height: number, alpha = 255): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx] = (x * 31 + y * 7) % 256;
      png.data[idx + 1] = (x * 11 + y * 29) % 256;
      png.data[idx + 2] = (x * 17 + y * 13) % 256;
      png.data[idx + 3] = alpha;
    }
  }
  return PNG.sync.write(png);
}

function jpegBuffer(width: number, height: number): Buffer {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) * 4;
      data[idx] = (x * 23 + y * 5) % 256;
      data[idx + 1] = (x * 3 + y * 19) % 256;
      data[idx + 2] = 128;
      data[idx + 3] = 255;
    }
  }
  return Buffer.from(jpeg.encode({ data, width, height }, 80).data);
}

function visibleText(value: string): string {
  return value.replace(ANSI_RE, '');
}

describe('imageToAscii', () => {
  test('renders png buffers', () => {
    const out = imageToAscii(pngBuffer(32, 16), 'png', 80);
    expect(out).toBeString();
    expect(out).not.toBe('');
    expect(out!).toMatch(BLOCK_RE);
  });

  test('renders jpeg buffers', () => {
    const out = imageToAscii(jpegBuffer(32, 16), '.jpg', 80);
    expect(out).toBeString();
    expect(out).not.toBe('');
    expect(out!).toMatch(BLOCK_RE);
  });

  test('treats dot and no-dot extensions the same', () => {
    const buffer = pngBuffer(16, 8);
    expect(imageToAscii(buffer, 'png', 80)).toBe(imageToAscii(buffer, '.png', 80));
  });

  test('returns null for invalid or unsupported input', () => {
    expect(imageToAscii(Buffer.from('not an image'), 'png', 80)).toBeNull();
    expect(imageToAscii(pngBuffer(8, 8), 'gif', 80)).toBeNull();
  });

  test('renders images narrower than the minimum column ladder', () => {
    const out = imageToAscii(pngBuffer(8, 8), 'png', 80);
    expect(out).toBeString();
    expect(out).not.toBe('');
    expect(out!).toMatch(BLOCK_RE);
  });

  test('renders transparent pixels as terminal background spaces', () => {
    const out = imageToAscii(pngBuffer(4, 4, 0), 'png', 80);
    expect(out).toBeString();
    expect(visibleText(out!).trim()).toBe('');
    expect(out!).not.toMatch(BLOCK_RE);
  });

  test('keeps moderately large renders under the inline byte budget', () => {
    const out = imageToAscii(pngBuffer(96, 96), 'png', 120);
    expect(out).toBeString();
    expect(out!.length).toBeLessThanOrEqual(9200);
  });
});
