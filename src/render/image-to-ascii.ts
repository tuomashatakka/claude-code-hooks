import chalk from 'chalk';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';

chalk.level = 3;

declare module 'jpeg-js' {
  export function decode(
    buf: Buffer | Uint8Array,
    opts?: { useTArray?: boolean }
  ): { width: number; height: number; data: Uint8Array };
}

const RAMP = ' .:-=+*#%@';

interface RGBAImage {
  width: number;
  height: number;
  data: Uint8Array | Buffer;
}

export function imageToAscii(buffer: Buffer, ext: string, maxWidth: number = 80): string | null {
  let img: RGBAImage;
  const normalizedExt = ext.toLowerCase().replace(/^\./, '');
  try {
    if (normalizedExt === 'png') {
      img = PNG.sync.read(buffer);
    } else if (normalizedExt === 'jpg' || normalizedExt === 'jpeg') {
      img = jpeg.decode(buffer, { useTArray: true });
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }

  const { width, height, data } = img;
  if (!width || !height) return null;

  // Terminal characters are roughly twice as tall as they are wide.
  const targetWidth = Math.min(width, maxWidth);
  const scaleX = width / targetWidth;
  const scaleY = scaleX * 2.0;
  const targetHeight = Math.max(1, Math.round(height / scaleY));

  let ascii = '';
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const origX = Math.min(width - 1, Math.floor(x * scaleX));
      const origY = Math.min(height - 1, Math.floor(y * scaleY));
      const idx = (origY * width + origX) * 4;

      const r = data[idx] ?? 0;
      const g = data[idx + 1] ?? 0;
      const b = data[idx + 2] ?? 0;
      const a = data[idx + 3] ?? 255;

      if (a === 0) {
        ascii += ' ';
        continue;
      }

      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const rampIdx = Math.min(RAMP.length - 1, Math.floor((l / 255) * RAMP.length));
      const char = RAMP[rampIdx] ?? ' ';
      ascii += chalk.rgb(r, g, b)(char);
    }
    if (y < targetHeight - 1) {
      ascii += '\n';
    }
  }

  return ascii;
}
