import { describe, expect, test } from 'bun:test';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import {
  imageToAscii,
  regularSextant,
  separatedSextant,
} from '@tuomashatakka/image-to-ascii';

const ANSI_RE = /\x1b\[[0-9;]*m/g;
const BLOCK_RE = /[\u2580\u2584\u2588\u258c\u2590\u{1fb00}-\u{1fb3b}\u{1ce51}-\u{1ce86}]/u;

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

function maskedPng(mask: number): Buffer {
  const png = new PNG({ width: 2, height: 3 });
  for (let i = 0; i < 6; i++) {
    const idx = i * 4;
    png.data[idx] = 120;
    png.data[idx + 1] = 210;
    png.data[idx + 2] = 240;
    png.data[idx + 3] = mask & (1 << i) ? 255 : 0;
  }
  return PNG.sync.write(png);
}

function visibleText(value: string): string {
  return value.replace(ANSI_RE, '');
}

describe('imageToAscii', () => {
  test('maps regular sextant masks around the legacy half-block gaps', () => {
    expect(regularSextant(1)).toBe('🬀');
    expect(regularSextant(0b011000)).toBe('🬖');
    expect(regularSextant(0b010101)).toBe('▌');
    expect(regularSextant(0b101010)).toBe('▐');
    expect(regularSextant(0b111111)).toBe('█');
  });

  test('honors the inclusive separated-sextant cutoff at U+1CE86', () => {
    expect(separatedSextant(1)).toBe('𜹑');
    expect(separatedSextant(0b110110)).toBe('𜺆');
    expect(separatedSextant(0b110111)).toBeNull();
  });

  test('uses separated sextants for transparent edge masks', () => {
    const out = visibleText(imageToAscii(maskedPng(0b110110), 'png', 80)!);
    expect(out).toBe('𜺆');
  });

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

  test('supports an explicit half-block compatibility mode', () => {
    const previous = process.env.CLAUDE_HOOKS_IMAGE_MODE;
    process.env.CLAUDE_HOOKS_IMAGE_MODE = 'half';
    try {
      const out = imageToAscii(pngBuffer(16, 8), 'png', 80);
      expect(out).toMatch(/[▀▄█]/);
      expect(out).not.toMatch(/[\u{1fb00}-\u{1fb3b}\u{1ce51}-\u{1ce86}]/u);
    } finally {
      if (previous === undefined) delete process.env.CLAUDE_HOOKS_IMAGE_MODE;
      else process.env.CLAUDE_HOOKS_IMAGE_MODE = previous;
    }
  });

  test('keeps moderately large renders under the inline byte budget', () => {
    const out = imageToAscii(pngBuffer(96, 96), 'png', 120);
    expect(out).toBeString();
    expect(out!.length).toBeLessThanOrEqual(9200);
  });
});

describe('braille mode', () => {
  // One cell, one pixel per dot: what comes back names the dot numbering
  // directly, which is the part of braille that is easy to get subtly wrong.
  function cell(dark: ReadonlyArray<readonly [x: number, y: number]>): string {
    const png = new PNG({ width: 2, height: 4 });
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 2; x++) {
        const at = (2 * y + x) << 2;
        const ink = dark.some(([dx, dy]) => dx === x && dy === y) ? 0 : 255;
        png.data[at] = ink; png.data[at + 1] = ink; png.data[at + 2] = ink; png.data[at + 3] = 255;
      }
    }
    return imageToAscii(PNG.sync.write(png), '.png', { maxWidth: 1, mode: 'braille' })!;
  }

  test('numbers dots down the columns, then the eighth-dot row', () => {
    expect(cell([[0, 0]])).toBe('⠁');            // dot 1
    expect(cell([[0, 2]])).toBe('⠄');            // dot 3
    expect(cell([[1, 0]])).toBe('⠈');            // dot 4
    expect(cell([[0, 3]])).toBe('⡀');            // dot 7
    expect(cell([[1, 3]])).toBe('⢀');            // dot 8
  });

  test('a blank cell is a space, and a full one is every dot', () => {
    expect(cell([])).toBe('');
    expect(cell([[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2], [1, 3]])).toBe('⣿');
  });

  test('spends no escape sequences at all', () => {
    const art = imageToAscii(pngBuffer(120, 80), '.png', { maxWidth: 40, mode: 'braille' })!;
    expect(art).not.toMatch(ANSI_RE);
    expect(art).toMatch(/[⠀-⣿]/u);
  });

  test('honours a byte budget the colour modes could not', () => {
    const art = imageToAscii(pngBuffer(400, 300), '.png', {
      maxWidth: 90,
      mode: 'braille',
      budget: { total: 600, bytes: true },
    })!;
    expect(Buffer.byteLength(art, 'utf8')).toBeLessThanOrEqual(600);
  });
});
