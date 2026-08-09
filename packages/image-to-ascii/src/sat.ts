import type { RGBAImage } from './decode.ts';

/**
 * A summed-area table over the source image, so any rectangle's mean colour
 * costs a constant four lookups instead of a loop over its pixels.
 *
 * Point-sampling one pixel per sub-cell — what this replaces — throws away
 * essentially the whole image when a 1200px screenshot is squeezed into ~170
 * sub-columns, and the aliasing it produces also *costs* budget: noisy cells
 * break SGR runs that a smooth average would have extended.
 *
 * Colour is stored premultiplied by alpha so that averaging across a
 * transparent edge cannot drag in whatever colour happens to sit under the
 * transparent pixels. Premultiplication is done in 8-bit, which is exact
 * whenever alpha is 255 — i.e. for every fully opaque image — and rounds by at
 * most half a level elsewhere.
 *
 * Uint32 is deliberate: sums reach 255 * width * height, which stays inside
 * 2^32 for any image up to ~16.8 megapixels, and `buildSAT` decimates before
 * that becomes reachable. Float32 would silently lose exactness above ~65k
 * pixels, which is nothing.
 */
export interface ImageSAT {
  /** Dimensions of the (possibly decimated) grid the table covers. */
  width: number;
  height: number;
  /** Stride of one SAT row: width + 1. */
  stride: number;
  /** Premultiplied r, g, b, then alpha. Each (width+1) * (height+1). */
  planes: readonly Uint32Array[];
}

/**
 * Above this the SAT itself becomes the memory hog rather than the image. A
 * render is at most ~90 cells wide, so ~180 sub-columns; decimating a huge
 * source by an integer factor first discards nothing that survives to a cell.
 */
const MAX_SAT_PIXELS = 4_000_000;

export function decimationFactor(width: number, height: number): number {
  let factor = 1;
  while ((width / factor) * (height / factor) > MAX_SAT_PIXELS) factor++;
  return factor;
}

export function buildSAT(img: RGBAImage): ImageSAT {
  const factor = decimationFactor(img.width, img.height);
  const width = Math.max(1, Math.floor(img.width / factor));
  const height = Math.max(1, Math.floor(img.height / factor));
  const stride = width + 1;
  const planes = [
    new Uint32Array(stride * (height + 1)),
    new Uint32Array(stride * (height + 1)),
    new Uint32Array(stride * (height + 1)),
    new Uint32Array(stride * (height + 1)),
  ];

  for (let y = 0; y < height; y++) {
    const rowAbove = y * stride;
    const row = (y + 1) * stride;
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      const sx1 = Math.min(img.width, (x + 1) * factor);
      const sy1 = Math.min(img.height, (y + 1) * factor);
      for (let sy = y * factor; sy < sy1; sy++) {
        for (let sx = x * factor; sx < sx1; sx++) {
          const i = (sy * img.width + sx) * 4;
          const alpha = img.data[i + 3] ?? 255;
          r += Math.round(((img.data[i] ?? 0) * alpha) / 255);
          g += Math.round(((img.data[i + 1] ?? 0) * alpha) / 255);
          b += Math.round(((img.data[i + 2] ?? 0) * alpha) / 255);
          a += alpha;
          n++;
        }
      }
      const inv = n || 1;
      const values = [Math.round(r / inv), Math.round(g / inv), Math.round(b / inv), Math.round(a / inv)];
      for (let p = 0; p < 4; p++) {
        const plane = planes[p]!;
        plane[row + x + 1] =
          values[p]! + plane[row + x]! + plane[rowAbove + x + 1]! - plane[rowAbove + x]!;
      }
    }
  }

  return { width, height, stride, planes };
}

/**
 * Bilinear interpolation of an integer SAT is *exact* for an image of unit
 * squares of constant colour — the cross terms work out to the partial row,
 * column and corner contributions — so fractional rectangle edges cost nothing
 * in accuracy. That matters: at 86 columns a 1200px image gives 2.3 pixels per
 * sub-cell, and rounding those edges to integers visibly thickens thin lines.
 */
export interface AreaSample {
  r: number;
  g: number;
  b: number;
  /** Mean alpha over the rect, 0-255. */
  a: number;
}

/**
 * Exact area-average of the source over a rectangle given in *source pixel*
 * coordinates. Colour comes back un-premultiplied, so a mostly-transparent rect
 * still reports the colour of the ink that is actually in it.
 */
export function rectMean(
  sat: ImageSAT,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  out: AreaSample,
  withAlpha = true,
): AreaSample {
  const { stride, width, height, planes } = sat;
  const area = (x1 - x0) * (y1 - y0);
  if (!(area > 0)) {
    out.r = 0; out.g = 0; out.b = 0; out.a = 0;
    return out;
  }

  // The four corner lookups are shared across planes: same fractional position,
  // same interpolation weights, so the index arithmetic is done once. This runs
  // tens of thousands of times per render — it allocates nothing on purpose.
  const cx0 = x0 < 0 ? 0 : x0 > width ? width : x0;
  const cy0 = y0 < 0 ? 0 : y0 > height ? height : y0;
  const cx1 = x1 < 0 ? 0 : x1 > width ? width : x1;
  const cy1 = y1 < 0 ? 0 : y1 > height ? height : y1;

  const xi0 = cx0 < width - 1 ? cx0 | 0 : width - 1;
  const xi1 = cx1 < width - 1 ? cx1 | 0 : width - 1;
  const yi0 = cy0 < height - 1 ? cy0 | 0 : height - 1;
  const yi1 = cy1 < height - 1 ? cy1 | 0 : height - 1;
  const fx0 = cx0 - xi0;
  const fx1 = cx1 - xi1;
  const fy0 = cy0 - yi0;
  const fy1 = cy1 - yi1;

  const rowA0 = yi0 * stride;
  const rowB0 = rowA0 + stride;
  const rowA1 = yi1 * stride;
  const rowB1 = rowA1 + stride;

  // Weights for S(x,y) = bilinear(SAT) at each of the four corners.
  const w00a = (1 - fx0) * (1 - fy0), w10a = fx0 * (1 - fy0), w01a = (1 - fx0) * fy0, w11a = fx0 * fy0;
  const w00b = (1 - fx1) * (1 - fy0), w10b = fx1 * (1 - fy0), w01b = (1 - fx1) * fy0, w11b = fx1 * fy0;
  const w00c = (1 - fx0) * (1 - fy1), w10c = fx0 * (1 - fy1), w01c = (1 - fx0) * fy1, w11c = fx0 * fy1;
  const w00d = (1 - fx1) * (1 - fy1), w10d = fx1 * (1 - fy1), w01d = (1 - fx1) * fy1, w11d = fx1 * fy1;

  const inv = 1 / area;
  const count = withAlpha ? 4 : 3;
  let r = 0, g = 0, b = 0, a = 0;
  for (let p = 0; p < count; p++) {
    const plane = planes[p]!;
    const s11 = plane[rowA1 + xi1]! * w00d + plane[rowA1 + xi1 + 1]! * w10d
              + plane[rowB1 + xi1]! * w01d + plane[rowB1 + xi1 + 1]! * w11d;
    const s01 = plane[rowA1 + xi0]! * w00c + plane[rowA1 + xi0 + 1]! * w10c
              + plane[rowB1 + xi0]! * w01c + plane[rowB1 + xi0 + 1]! * w11c;
    const s10 = plane[rowA0 + xi1]! * w00b + plane[rowA0 + xi1 + 1]! * w10b
              + plane[rowB0 + xi1]! * w01b + plane[rowB0 + xi1 + 1]! * w11b;
    const s00 = plane[rowA0 + xi0]! * w00a + plane[rowA0 + xi0 + 1]! * w10a
              + plane[rowB0 + xi0]! * w01a + plane[rowB0 + xi0 + 1]! * w11a;
    const value = (s11 - s01 - s10 + s00) * inv;
    if (p === 0) r = value; else if (p === 1) g = value; else if (p === 2) b = value; else a = value;
  }

  if (!withAlpha) a = 255;
  const scale = a > 0 ? 255 / a : 0;
  out.r = r * scale;
  out.g = g * scale;
  out.b = b * scale;
  out.a = a;
  return out;
}

/** Maps a sub-cell grid position onto the SAT's coordinate space. */
export function subCellRect(
  sat: ImageSAT,
  gridX: number,
  gridY: number,
  gridCols: number,
  gridRows: number,
): [x0: number, y0: number, x1: number, y1: number] {
  return [
    (gridX * sat.width) / gridCols,
    (gridY * sat.height) / gridRows,
    ((gridX + 1) * sat.width) / gridCols,
    ((gridY + 1) * sat.height) / gridRows,
  ];
}
